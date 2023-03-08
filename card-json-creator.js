const fs = require('fs');
const csv = require('csv-parser');

const inputFilePath = 'cards.csv';
const outputFilePath = 'cards.json';

const rows = [];
fs.createReadStream(inputFilePath)
  .pipe(csv())
  .on('data', (row) => {
    rows.push(row);
  })
  .on('end', () => {
    const headers = Object.keys(rows[0]);
    const json = rows.map((row) =>
      headers.reduce((obj, key) => {
        obj[key] = row[key];
        return obj;
      }, {})
    );
    fs.writeFile(outputFilePath, JSON.stringify(json, null, 2), (err) => {
      if (err) throw err;
      console.log(`JSON object saved to ${outputFilePath}`);
    });
  });
