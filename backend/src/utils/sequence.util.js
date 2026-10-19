async function nextNumber(connection, sequenceKey, periodKey, prefix, digits = 5) {
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
  return `${prefix}-${periodKey}-${String(next).padStart(digits, '0')}`;
}

function year2Period(date = new Date()) {
  return String(date.getFullYear()).slice(-2);
}

module.exports = { nextNumber, year2Period };
