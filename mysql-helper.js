const mysql = require('mysql');
var azureCreds = require('./azure-creds.json');

const conn = mysql.createConnection({
  host: azureCreds.MYSQL_HOST,
  user: azureCreds.MYSQL_USER,
  password: azureCreds.MYSQL_PASSWORD,
  database: azureCreds.MYSQL_DATABASE,
});

module.exports = function (query, values) {
  new Promise((resolve, reject) => {
    try {
      conn.connect((getConnectionError) => {
        if (getConnectionError) {
          conn.end();
          throw getConnectionError;
        }

        conn.query(query, values, function connectionQueryCall(err, rows) {
          conn.release();
          if (!err) {
            conn.end();
            resolve(rows);
          } else {
            conn.end();
            throw err;
          }
        });
      });
    } catch (dbQueryCatchError) {
      reject(dbQueryCatchError);
    }
  });
};