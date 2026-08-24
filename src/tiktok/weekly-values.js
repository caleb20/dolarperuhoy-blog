export function lastCompletedWeekDays(all) {
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = new Date();
  const daysSinceFriday = (today.getDay() - 5 + 7) % 7 || 7;
  const friday = new Date(today);
  friday.setDate(friday.getDate() - daysSinceFriday);
  const monday = new Date(friday);
  monday.setDate(monday.getDate() - 4);
  return all.filter((d) => d.date >= iso(monday) && d.date <= iso(friday));
}

export function computeWeeklyValues(weeklyData) {
  const all = (weeklyData.sunat || [])
    .filter((r) => r.sell_rate != null)
    .map((r) => ({ date: String(r.date), value: Number(r.sell_rate) }))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (all.length === 0) throw new Error('Sin datos SUNAT de la semana para renderizar TikTok');
  const lastWeek = lastCompletedWeekDays(all);
  const days = lastWeek.length >= 2 ? lastWeek : all.slice(-5);
  const open = days[0];
  const close = days[days.length - 1];
  const diff = Number((close.value - open.value).toFixed(3));
  const pct = Number(((diff / open.value) * 100).toFixed(2));
  return { days, open, close, diff, pct, direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat' };
}

export function computeMiercolesData(sunatRows, snapshot) {
  const days = sunatRows
    .filter((r) => r.value != null)
    .map((r) => ({ date: String(r.date), value: Number(r.value) }))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (days.length === 0 || snapshot?.sell_rate == null) {
    throw new Error('Faltan datos para el pulso de miércoles');
  }
  const monday = days.find((d) => new Date(`${d.date}T12:00:00Z`).getUTCDay() === 1) || days[0];
  const byDow = Object.fromEntries(days.map((d) => [new Date(`${d.date}T12:00:00Z`).getUTCDay(), d.value]));
  const sellNow = Number(snapshot.sell_rate);
  const amount = Number((sellNow - monday.value).toFixed(3));
  return {
    snapshot: { buy: Number(snapshot.buy_rate), sell: sellNow },
    diff: { amount, direction: amount > 0 ? 'up' : amount < 0 ? 'down' : 'flat' },
    days: {
      lun: monday.value,
      mar: byDow[2] ?? null,
      mie: byDow[3] ?? sellNow,
    },
  };
}
