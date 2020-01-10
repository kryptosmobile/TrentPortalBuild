angular.module('sqlService', []).factory('sqlLiteServ', ['$http', '$rootScope', '$location', function($http, $rootScope, $location) {
    return {
        openDataBase: async function() {
            return await window.sqlitePlugin.openDatabase({
                name: `unifyed.${$rootScope.tenantId}`,
                location: 'default',
            });
        },
        addUpdateData: function(table, data) {
            data = JSON.stringify(data);
            let db = this.openDataBase();
            db.transaction(function(tx) {
                tx.executeSql(`CREATE TABLE IF NOT EXISTS ${table} (info)`);
                tx.executeSql(`INSERT INTO ${table} VALUES (?1)`, [data]);
            }, function(error) {
                console.log('Transaction ERROR: ' + error.message);
            }, function() {
                return 'Populated database OK';
            });
        },
        runGetQuery: async function(query, cb) {
            let db = await this.openDataBase();
            db.transaction(function(tx) {
                console.log(query[0]);
                tx.executeSql(query[0].q, query[0].d, function(tx, resultSet) {
                        console.log('resultSet', resultSet);
                        if (resultSet.rows.length > 0) {
                            cb(null, resultSet.rows);
                        } else {
                            cb('record not found', resultSet.rows);
                        }

                    },
                    function(tx, error) {
                        console.log('error', error);
                        cb('error', error);
                    });
            }, function(error) {
                console.log('Transaction ERROR: ' + error.message);
            }, function() {
                console.log('Transaction success');
            });
        },
        updateData: function() {
            return 0
        },
        runAddQuery: async function(query, cb) {
            let db = await this.openDataBase();
            db.transaction(function(tx) {
                angular.forEach(query, function(val, key) {
                    console.log(val);
                    if (!val.d) {
                        tx.executeSql(val.q);
                    } else {
                        tx.executeSql(val.q, val.d, function(tx, res) {
                                console.log("insertId: " + res.insertId + " -- probably 1");
                                console.log("rowsAffected: " + res.rowsAffected + " -- should be 1");
                            },
                            function(tx, error) {
                                console.log('INSERT error: ' + error.message);
                            });
                    }
                });
            }, function(error) {
                console.log('Transaction ERROR: ' + error.message);
                cb('error', error);
            }, function() {
                console.log('Transaction success:');
                cb(null, 'data added');
            });
        }
    }
}]);
