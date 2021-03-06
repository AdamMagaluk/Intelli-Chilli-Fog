var HueApi = require("node-hue-api").HueApi;
    Fog = require('thefog'),
    Client = require('intelli-chilli-client'),
    udpserver = require('./chilli-server'),
    hue = require('./hue'),
    ClientId = '28554D220500009C',
    Packet = Fog.Packet;

var WS_SERVER = process.env.WS_SERVER || 'ws://thefog.herokuapp.com/';
var ARDUINO = process.env.ARDUINO || 'arduino1.local';

var client = new Fog.Client({'endpoint': WS_SERVER });
var chili = new Client({address:ARDUINO});

function updateClientId(callback){
  if(typeof callback === 'function')
    callback();
}

updateClientId();

client.on('error', function(data) {
  console.log('error',data);
  process.exit(1);
});

client.on('close', function() {
  console.log('disconnected');
  process.exit(1);
});

client.open(function() {
  console.log('Client opened!');

  //Needed to keep connection alive.
  setInterval(function() {
    var p = new Packet({'action':'HEARTBEAT'});
    p.setClientId(ClientId);
    client.send(p);
  }, 3000);


});

client.on('ACK', function(data) {
  var clientId = data.clientId;
  console.log('subscription acknowledged');
  var p = new Packet({'action':'REGISTER'});
  p.setClientId(ClientId);
  client.send(p);
});

client.on('PING', function(p) {
  var start = new Date().getTime();
  chili.ping(function(err) {
    if(err){
      var p2 = new Packet({'action':'PING',data : { error : err.message} });  
      p2.setClientId(ClientId);
      return client.respondTo(p, p2);
    }
    var time = new Date().getTime()-start;
    var p2 = new Packet({'action':'PING',data : {pingTime : time} });
    p2.setClientId(ClientId);
    return client.respondTo(p, p2);
  });
});

client.on('state', function(p) {
  chili.returnState(function(err,state) {
    if(err){
      var p2 = new Packet({'action':'state',data : { error : err.message} });  
      p2.setClientId(ClientId);
      return client.respondTo(p, p2);
    }

    var p2 = new Packet({'action':'state',data : state});
    p2.setClientId(ClientId);
    client.respondTo(p, p2);
  });
});


client.on('time', function(p) {
  chili.setCookTime(p.message.data.time,function(err){
    if(err){
      var p2 = new Packet({'action':'time',data : { error : err.message} });  
      p2.setClientId(ClientId);
      return client.respondTo(p, p2);
    }

    var p2 = new Packet({'action':'time',data : { time : p.message.data.time} });
    p2.setClientId(ClientId);
    client.respondTo(p, p2);
  });
});

client.on('temp', function(p) {
  chili.setCookTemp(p.message.data.temp,function(err){
    if(err){
      var p2 = new Packet({'action':'temp',data : { error : err.message} });  
      p2.setClientId(ClientId);
      return client.respondTo(p, p2);
    }

    var p2 = new Packet({'action':'temp',data : { temp : p.message.data.temp} });
    p2.setClientId(ClientId);
    client.respondTo(p, p2);
  });
});

client.on('start', function(p) {
  chili.startCook(function(err){
    if(err){
      var p2 = new Packet({'action':'start',data : { error : err.message} });  
      p2.setClientId(ClientId);
      return client.respondTo(p, p2);
    }

    var p2 = new Packet({'action':'start',data : {}});
    p2.setClientId(ClientId);
    client.respondTo(p, p2);
  });
});

client.on('stop', function(p) {
  chili.stopCook(function(err){
    if(err){
      var p2 = new Packet({'action':'stop',data : { error : err.message} });  
      p2.setClientId(ClientId);
      return client.respondTo(p, p2);
    }

    var p2 = new Packet({'action':'stop',data : {}});
    p2.setClientId(ClientId);
    client.respondTo(p, p2);
  });
});


client.on('reset', function(p) {
  chili.resetDevice(function(err){
    if(err){
      var p2 = new Packet({'action':'reset',data : { error : err.message} });  
      p2.setClientId(ClientId);
      return client.respondTo(p, p2);
    }

    var p2 = new Packet({'action':'reset',data : {}});
    p2.setClientId(ClientId);
    client.respondTo(p, p2);
  });
});



udpserver.bind(3000);

udpserver.on('error',function(err){
  console.error(err);
});

udpserver.on('powered',function(msg,rinfo){
  console.log("Event: (powered on) from " + rinfo.address + ":" + rinfo.port);

  function updateFrontEnd(){
    var p = new Packet({'action':'powered',data : { host : rinfo.address }  })
    p.setClientId(ClientId);
    client.send(p);
  }

  if(ClientId === null)
    updateClientId(updateFrontEnd);

  updateFrontEnd();
});

udpserver.on('cookend',function(msg,rinfo){
  if(ClientId === null)
    updateClientId();

  hue.notification(function(err){
    if(err)
      console.error(err);
  });
  var p = new Packet({'action':'cookend',data : { host : rinfo.address }});
  p.setClientId(ClientId);
  client.send(p);
  console.log("Event: (cook end) from " + rinfo.address + ":" + rinfo.port);
});

udpserver.on('lidopened',function(msg,rinfo){

  if(ClientId === null)
    updateClientId();

  hue.notificationOne(function(err){
    if(err)
      console.error(err);
  });
  var p = new Packet({'action':'lidopened',data : { host : rinfo.address }});
  p.setClientId(ClientId);
  client.send(p);
  
  console.log("Event: (lid closed) from " + rinfo.address + ":" + rinfo.port);
});

udpserver.on('lidclosed',function(msg,rinfo){

  if(ClientId === null)
    updateClientId();

  hue.notificationOne(function(err){
    if(err)
      console.error(err);
  });

  var p = new Packet({'action':'lidclosed',data : { host : rinfo.address }});
  p.setClientId(ClientId);
  client.send(p);
  
  console.log("Event: (lid opened) from " + rinfo.address + ":" + rinfo.port);
});



