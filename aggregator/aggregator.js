var simpleStatistics = require('simple-statistics');

module.exports = function(RED) {
    function AggregatorNode(config) {
        RED.nodes.createNode(this,config);
        var node = this;

        node.intervalCount = config["interval-count"];
        node.intervalUnits = config["interval-units"];
        node.absoluteStartupTime = new Date().getTime();
        node.factor = 1;

        switch(config.intervalUnits) {
            case "s":
                node.factor = 1000;
                break;
            case "m":
                node.factor = 1000 * 60;
                break;
            case "h":
                node.factor = 1000 * 60 * 60;
                break;
            case "d":
                node.factor = 1000 * 60 * 60 * 24;
                break;
        }
        node.intervalTime = node.factor * config.intervalCount;
        node.startupTime = node.intervalTime - (node.absoluteStartupTime % node.intervalTime);

        node.values = {};

        node.aggregate = function(list) {

            var output = null;

            if(list.length == 0) return null;

            switch(config.aggregationType) {
                case "mean":
                    output = simpleStatistics.mean(list);
                    break;

                case "geometricMean":
                    output = simpleStatistics.geometricMean(list);
                    break;

                case "harmonicMean":
                    output = simpleStatistics.harmonicMean(list);
                    break;

                case "median":
                    output = simpleStatistics.median(list);
                    break;

                case "min":
                    output = simpleStatistics.min(list);
                    break;

                case "max":
                    output = simpleStatistics.max(list);
                    break;
            }

            return output;
        };

        node.aggregateAll = function() {
            var results = [];

            for (var topic in node.values ) {
                if (node.values.hasOwnProperty(topic)) {
                    var result = node.aggregate(node.values[topic]);

                    if(result) results.push(result);
                }
            }

            var output = node.aggregate(results);

            if(output) {
                node.send({
                    topic: config.topic,
                    payload: output
                });
            }

            node.values = {};
        };

        node.primaryTimeout = setTimeout(function() {

            node.interval = setInterval(node.aggregateAll, node.intervalTime);

            if(node.submitIncompleteInterval) node.aggregateAll();

        }, node.startupTime);

        this.on('input', function(msg) {
          try {
                if (msg.payload != null && msg.payload != '') {
                    var lowerTopic = msg.topic.toString().toLowerCase();

                    if(!node.values[lowerTopic]) {
                        node.values[lowerTopic] = [];
                    }
                    node.values[lowerTopic].push(parseInt(msg.payload,10));
                }

                  if(node.values.length <= 1) {
                      setTimeout(function(theNode) {



                      }, config.timeoutInMS, node);
                  }
                  
            } catch(err) {
                node.error(err.message);
            }
        });

        this.on('close', function() {
            clearTimeout(node.primaryTimeout);
            clearInterval(node.interval);
        });
    }
    RED.nodes.registerType("aggregator",AggregatorNode);
};