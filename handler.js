'use strict';

/* eslint-disable no-param-reassign */

module.exports.store = function (context, req) {
  context.log('request body: ', req.body);

  const res = {
    headers:{
      'content-type':'application/json',
    },
    body: {
      'message':'success',
    }
  };

  context.done(null, res);
};
