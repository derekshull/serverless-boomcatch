'use strict';
var azure = require('azure-storage');
var azureCreds = require('./azure-creds.json');

module.exports = {
  store: function (context, req) {
    context.log('request body: ', req.body);

    const successRes = {
      headers:{
        'content-type':'application/json',
      },
      body: {
        'message':'success',
      }
    };

    const failRes = {
      status: 500,
      headers:{
        'content-type':'application/json',
      },
      body: {
        'message':'failed',
      }
    };

    process.env.AZURE_STORAGE_CONNECTION_STRING = azureCreds.AZURE_STORAGE_CONNECTION_STRING;
    var retryOperations = new azure.ExponentialRetryPolicyFilter();
    var queueSvc = azure.createQueueService().withFilter(retryOperations);
    queueSvc.createQueueIfNotExists('beaconprocessingqueue', function(createQueueError, createQueueResults, createQueueResponse){
      if(!createQueueError) {
        queueSvc.createMessage('beaconprocessingqueue', req.body, function(createMessageError, createMessageResults, createMessageResponse){
          if(!createMessageError) {
            context.done(null, successRes);
          } else {
            context.done(null, failRes);
          }
        });
      } else {
        context.done(null, failRes);
      }
    });
  },
  process: function(context, item) {
    context.log(`Received item: ${item}`);
    context.done();
  }
};
