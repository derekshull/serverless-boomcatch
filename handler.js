'use strict';
var azure = require('azure-storage');
var qs = require('qs');
var dbQuery = require('./mysql-helper.js');
var azureCreds = require('./azure-creds.json');

function parseBeacon(item) {
  return new Promise(function (resolve, reject) {
    try {
      resolve(JSON.parse(item.replace(/&quot;/g,'"')));
    } catch (e) {
      reject(e);
    }
  });
}

function filterBeacon(item) {
  return new Promise(function (resolve, reject) {
    try {
      var allowedKeys = [
        'mob.etype',
        'mob.lm',
        'mob.dl',
        'mob.rtt',
        'rt.start',
        'rt.tstart',
        'rt.bstart',
        'rt.end',
        't_resp',
        't_page',
        't_done',
        'pt.fp',
        'pt.fcp',
        'nt_nav_st',
        'nt_fet_st',
        'nt_dns_st',
        'nt_dns_end',
        'nt_con_st',
        'nt_con_end',
        'nt_req_st',
        'nt_res_st',
        'nt_res_end',
        'nt_domloading',
        'nt_domint',
        'nt_domcontloaded_st',
        'nt_domcontloaded_end',
        'nt_domcomp',
        'nt_load_st',
        'nt_load_end',
        'nt_unload_st',
        'nt_unload_end',
        'nt_enc_size',
        'nt_dec_size',
        'nt_trn_size',
        'nt_protocol',
        'nt_first_paint',
        'nt_red_cnt',
        'nt_nav_type',
        'u',
        'v',
        'ua.plt',
        'ua.vnd',
        'pid',
        'c.tti.vr',
        'c.f',
        'c.f.d',
        'c.f.m',
        'c.f.s',
        'dom.res',
        'dom.doms',
        'mem.total',
        'mem.limit',
        'mem.used',
        'scr.xy',
        'scr.bpp',
        'scr.orn',
        'cpu.cnc',
        'bat.lvl',
        'dom.ln',
        'dom.sz',
        'dom.img',
        'dom.img.ext',
        'dom.img.uniq',
        'dom.script',
        'dom.script.ext',
        'dom.iframe',
        'dom.link',
        'dom.link.css'
      ];

      resolve(
        Object.keys(item).filter(key => allowed.includes(key)).reduce((obj, key) => {
          obj[key] = item[key];
          return obj;
        }, {})
      );
    } catch (e) {
      reject(e);
    }
  });
}

module.exports = {
  store: function (context, req) {
    try {
      context.log('request body: ', req.body);

      const successRes = {
        headers:{
          'content-type':'application/json',
        },
        body: {
          'message':'success',
        }
      };

      process.env.AZURE_STORAGE_CONNECTION_STRING = azureCreds.AZURE_STORAGE_CONNECTION_STRING;
      var retryOperations = new azure.ExponentialRetryPolicyFilter();
      var queueSvc = azure.createQueueService().withFilter(retryOperations);
      queueSvc.createQueueIfNotExists('beaconprocessingqueue', function(createQueueError, createQueueResults, createQueueResponse){
        if(!createQueueError) {
          queueSvc.createMessage('beaconprocessingqueue', JSON.stringify(qs.parse(req.body)), function(createMessageError, createMessageResults, createMessageResponse){
            if(!createMessageError) {
              context.done(null, successRes);
            } else {
              throw createMessageError;
            }
          });
        } else {
          throw createQueueError;
        }
      });
    } catch(e) {
      context.done(null, {
        status: 500,
        headers:{
          'content-type':'application/json',
        },
        body: {
          'message':e,
        }
      });
    }
  },
  process: function(context, item) {
    try {
      context.log('got the item and processing');
      context.log('parsed item');

      parseBeacon(item).then(function(parsedBeacon) {
        filterBeacon(parsedBeacon).then(function(filteredBeacon) {
          var filteredKeysArray = Object.keys(filteredBeacon);
          var filteredValuesArray = Object.values(filteredBeacon);
          var keyString = filteredKeysArray.join(', ');
          var valueString = filteredValuesArray.join(', ');

          var query = `INSERT INTO beacons (${keyString}) VALUES (${valueString})`;

          dbQuery(query, [])
          .then(function() {
            context.log('inserted beacon into DB');
            context.done();
          })
          .catch(function(dbQueryError) {
            throw dbQueryError;
          });
        }).catch(function(filterBeaconError) {
          throw filterBeaconError;
        });
      }).catch(function(parseBeaconError) {
        throw parseBeaconError;
      });
    } catch(e) {
      context.log('error: ', e);
    }
  }
};
