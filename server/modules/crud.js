var bodyParser = require('body-parser'),
    jsonParser = bodyParser.json();

module.exports = {

  create: function (app) {
    app.get('/items/', function (req, res) {
      res.json({data: 'w00t!', method: 'get'});
    });

    app.post('/items', jsonParser, function (req, res) {
      if (!req.body) {
        return res.sendStatus(400);
      }

      res.status(201).json({data: 'w00t!', method: 'post'});
    });

    app.put('/items/:id', jsonParser, function (req, res) {
      if (!req.body) {
        return res.sendStatus(400);
      }
      res.status(200).json({data: 'w00t!', method: 'put', id: req.params.id});
    });

    app.delete('/items/:id', jsonParser, function (req, res) {
      // true for debug
      if (true) {
        res.status(200).json({
          data  : 'w00t!',
          method: 'delete',
          id    : req.params.id
        });
      } else {
        res.status(500).send({error: 'No item with id: ' + req.params.id});
      }
    });
  }

};


