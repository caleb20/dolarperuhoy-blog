export async function getWeeklyExchangeData(supabase) {
  const now = new Date();
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 15);
  const dateStr = twoWeeksAgo.toISOString().split('T')[0];

  const [sunat, snapshots, houses] = await Promise.all([
    supabase
      .from('sunat_exchange_rates')
      .select('date, buy_rate, sell_rate')
      .gte('date', dateStr)
      .order('date', { ascending: true }),
    supabase
      .from('exchange_rate_snapshots')
      .select('buy_rate, sell_rate, captured_at, trend, change_percent')
      .gte('captured_at', twoWeeksAgo.toISOString())
      .order('captured_at', { ascending: false })
      .limit(500),
    supabase
      .from('exchange_houses_latest')
      .select('name, buy_rate, sell_rate, spread, house_type, verified'),
  ]);

  const sunatData = sunat.data || [];
  const snapshotsData = snapshots.data || [];
  const housesData = houses.data || [];

  if (sunatData.length === 0 && snapshotsData.length === 0) {
    console.warn('[exchange-data] No hay datos históricos disponibles');
    return null;
  }

  const weekDays = sunatData.filter((r) => {
    const d = new Date(r.date);
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    return d >= weekAgo;
  });

  const sunatOpen = weekDays.length > 0 ? weekDays[0] : null;
  const sunatClose = weekDays.length > 0 ? weekDays[weekDays.length - 1] : null;

  let variationText = '';
  if (sunatOpen && sunatClose) {
    const diff = sunatClose.sell_rate - sunatOpen.sell_rate;
    const pct = (diff / sunatOpen.sell_rate) * 100;
    const direction = diff > 0 ? 'subió' : diff < 0 ? 'bajó' : 'se mantuvo estable';
    variationText = `El tipo de cambio ${direction} de S/${sunatOpen.sell_rate.toFixed(3)} a S/${sunatClose.sell_rate.toFixed(3)} (${diff > 0 ? '+' : ''}${pct.toFixed(2)}%)`;
  }

  return {
    sunat: sunatData,
    sunatWeek: weekDays,
    snapshots: snapshotsData,
    houses: housesData,
    variationText,
    weekStart: sunatOpen?.date || weekDays[0]?.date,
    weekEnd: sunatClose?.date || weekDays[weekDays.length - 1]?.date,
    currentRate: snapshotsData[0] || null,
    dateGenerated: now.toISOString(),
  };
}

export async function getMidweekExchangeData(supabase) {
  const now = new Date();
  const threeDaysAgo = new Date(now);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 4);

  const [snapshots, houses] = await Promise.all([
    supabase
      .from('exchange_rate_snapshots')
      .select('buy_rate, sell_rate, captured_at, trend, change_percent')
      .gte('captured_at', threeDaysAgo.toISOString())
      .order('captured_at', { ascending: false })
      .limit(100),
    supabase
      .from('exchange_houses_latest')
      .select('name, buy_rate, sell_rate, spread, house_type, verified'),
  ]);

  const snapshotsData = snapshots.data || [];
  const housesData = houses.data || [];

  if (snapshotsData.length === 0) {
    console.warn('[exchange-data] No hay snapshots recientes para midweek');
    return null;
  }

  return {
    snapshots: snapshotsData,
    houses: housesData,
    currentRate: snapshotsData[0] || null,
    dateGenerated: now.toISOString(),
  };
}
