async function nextNumber(connection, sequenceKey, periodKey, prefix, digits = 5, separator = '') {
  await connection.query(`
    INSERT INTO number_sequences (sequence_key, period_key, last_number)
    VALUES (?, ?, 0)
    ON DUPLICATE KEY UPDATE sequence_key = VALUES(sequence_key)
  `, [sequenceKey, periodKey]);

  const [rows] = await connection.query(`
    SELECT id, last_number
    FROM number_sequences
    WHERE sequence_key = ? AND period_key = ?
    FOR UPDATE
  `, [sequenceKey, periodKey]);

  const next = Number(rows[0]?.last_number || 0) + 1;
  await connection.query('UPDATE number_sequences SET last_number = ? WHERE id = ?', [next, rows[0].id]);
  return `${prefix}${separator}${periodKey}${separator}${String(next).padStart(digits, '0')}`;
}

function zonedParts(date = new Date(), timeZone = 'Asia/Jakarta') {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  return Object.fromEntries(parts.filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]));
}

function yearMonthPeriod(date = new Date(), timeZone = 'Asia/Jakarta') {
  const { year, month } = zonedParts(date, timeZone);
  return `${String(year).slice(-2)}${month}`;
}

function year2Period(date = new Date(), timeZone = 'Asia/Jakarta') {
  const { year } = zonedParts(date, timeZone);
  return String(year).slice(-2);
}

module.exports = { nextNumber, yearMonthPeriod, year2Period };
