//console.log("hello")
const express = require("express");
const app = express();
const clientConnection = require("./connection.js");
const responseTime = require('response-time');
const { apiCallsCounter, responseTimeGauge, requestSizeGauge, responseSizeGauge, client } = require('./metrics');
app.use(express.json());


app.use(responseTime({ suffix: false }), (req, res, next) => {
  if (req.path !== "/metrics") {
    const requestSize = req.socket.bytesRead;
    res.on('finish', () => {
      const responseSize = req.socket.bytesWritten;
      const responseTime = parseFloat(res.get('X-Response-Time'));
      apiCallsCounter.labels({ api:req.method, statusCode: res.statusCode}).inc();
      /*
      responseTimeGauge.labels({ api:req.method, statusCode: res.statusCode, requestID: req.headers['postman-token']}).set(responseTime);
      requestSizeGauge.labels({ api:req.method, statusCode: res.statusCode, requestID: req.headers['postman-token']}).set(requestSize);
      responseSizeGauge.labels({ api:req.method, statusCode: res.statusCode, requestID: req.headers['postman-token']}).set(responseSize);
      */
      responseTimeGauge.labels({ api:req.method, statusCode: res.statusCode}).set(responseTime);
      requestSizeGauge.labels({ api:req.method, statusCode: res.statusCode}).set(requestSize);
      responseSizeGauge.labels({ api:req.method, statusCode: res.statusCode,}).set(responseSize);
 
    });
  }
  next();
});



app.listen(8080, () => {
  console.log("Server is now listening at port 8080");
});

app.get("/metrics", async (req, res) => {
  try {
    const metricsData = await client.register.metrics();
    res.end(metricsData);
  } catch (error) {
    console.error("Error generating metrics:", error);
    res.status(500).send("Internal Server Error");
  }
});


app.get("/v1/datasets/:id", function (req, res) {
  const id = req.params.id;
  const query = 'SELECT * FROM datasets WHERE id = $1;';
  clientConnection.query(query, [id], (err, result) => {
    if (!err) {
      if (result.rows.length === 0) {
        const errorResponse = {
          id: "api.dataset.read",
          ver: "1.0",
          ts: new Date(),
          params: {
            err: "DATASET_NOT_FOUND",
            status: "Failed",
            errmsg: "No records found"
          },
          responseCode: "NOT_FOUND",
          result: {}
        };
        res.status(404).send(errorResponse);
      } else {
        const successresponse = {
          "id": "api.dataset.read",
          "ver": "1.0",
          "ts": new Date(),
          "params": {
            "err": null,
            "status": "successful",
            "errmsg": null
          },
          "responseCode": "OK",
          "result": result.rows[0]
        }
        res.send(successresponse)

      }
    } else {
      console.error(err.message);
      const errorResponse = {
        id: "api.dataset.read",
        ver: "1.0",
        ts: new Date(),
        params: {
          err: "DATABASE_ERROR",
          status: "Failed",
          errmsg: err.message
        },
        responseCode: "INTERNAL_SERVER_ERROR",
        result: {}
      };
      res.status(500).send(errorResponse);

    }
  });
});


app.get("/v1/datasets", (req, res) => {
  clientConnection.query(`select * from datasets;`, (err, result) => {
    if (!err) {
      res.send(result.rows);
    } else {
      console.error(err.message);
    }
  });
});


app.post("/v1/datasets", (req, res) => {
  const datasetData = req.body;

  const missingFields = [];
  if (!datasetData.id) {
    missingFields.push('id');
  }
  if (!datasetData.type) {
    missingFields.push('type');
  }
  if (!datasetData.updated_date) {
    missingFields.push('updated_date');
  }

  if (missingFields.length > 0) {
    return res.status(400).send({
      "id": "api.dataset.create",
      "ver": "1.0",
      "ts": new Date(),
      "params": {
        "err": "Missing fields",
        "status": "unsuccessful",
        "errmsg": `Please provide values for the following required fields: ${missingFields.join(', ')}`
      },
      "responseCode": "BAD REQUEST",
      "result": null
    });

  }

  const insertQuery = `INSERT INTO datasets (id, dataset_id, type, name, validation_config, extraction_config, 
                      dedup_config, data_schema, denorm_config, router_config, dataset_config, status, tags, 
                      data_version, created_by, updated_by, created_date, updated_date, published_date) 
                      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19);`;

  const values = [
    datasetData.id,
    datasetData.dataset_id || null,
    datasetData.type,
    datasetData.name || null,
    datasetData.validation_config || null,
    datasetData.extraction_config || null,
    datasetData.dedup_config || null,
    datasetData.data_schema || null,
    datasetData.denorm_config || null,
    datasetData.router_config || null,
    datasetData.dataset_config || null,
    datasetData.status || null,
    datasetData.tags || null,
    datasetData.data_version || null,
    datasetData.created_by || null,
    datasetData.updated_by || null,
    datasetData.created_date || new Date(),
    datasetData.updated_date,
    datasetData.published_date || new Date()
  ];

  clientConnection.query(insertQuery, values, (err, result) => {
    if (!err) {
      res.status(200).send({
        "id": "api.dataset.create",
        "ver": "1.0",
        "ts": new Date(),
        "params": {
          "err": null,
          "status": "successful",
          "errmsg": null
        },
        "responseCode": "OK",
        "result": {
          "id": datasetData.id
        }
      });
    } else {
      console.error(err.message);
      res.status(500).send({
        "id": "api.dataset.create",
        "ver": "1.0",
        "ts": new Date(),
        "params": {
          "err": "Database Error",
          "status": "unsuccessful",
          "errmsg": err.message
        },
        "responseCode": "INTERNAL_SERVER_ERROR",
        "result": null
      });
    }
  });

});

app.patch("/v1/datasets/:id", (req, res) => {
  const id = req.params.id;
  const updatedFields = req.body;


  if (Object.keys(updatedFields).length === 0) {
    return res.status(400).send({
      "id": "api.dataset.update",
      "ver": "1.0",
      "ts": new Date(),
      "params": {
        "err": "invalid_request",
        "status": "unsuccessful",
        "errmsg": `Please provide at least one field to update`
      },
      "responseCode": "BAD REQUEST",
      "result": null
    });

  }

  let setClause = '';
  const values = [];
  Object.keys(updatedFields).forEach((key, index) => {
    if (index > 0) {
      setClause += ', ';
    }
    setClause += `${key} = $${index + 1}`;
    values.push(updatedFields[key]);
  });

  const updateQuery = `UPDATE datasets SET ${setClause} WHERE id='${req.params.id}';`;

  clientConnection.query(updateQuery, values, (err, result) => {
    if (!err) {
      if (result.rowCount === 0) {
        res.status(404).send({
          "id": "api.dataset.update",
          "ver": "1.0",
          "ts": new Date(),
          "params": {
            "err": "Data Not Found",
            "status": "unsuccessful",
            "errmsg": `Data with ID ${id} not found.`
          },
          "responseCode": "NOT_FOUND",
          "result": null
        });
      } else {
        res.send({
          "id": "api.dataset.update",
          "ver": "1.0",
          "ts": new Date(),
          "params": {
            "err": null,
            "status": "successful",
            "errmsg": null
          },
          "responseCode": "OK",
          "result": {
            "id": id
          }
        });
      }
    } else {
      console.error(err.message);
      res.status(500).send({
        "id": "api.dataset.update",
        "ver": "1.0",
        "ts": new Date(),
        "params": {
          "err": "Database Error",
          "status": "unsuccessful",
          "errmsg": err.message
        },
        "responseCode": "INTERNAL_SERVER_ERROR",
        "result": null
      });
    }
  });
});

app.delete("/v1/datasets/:id", (req, res) => {
  const datasetsId = req.params.id;

  const deleteQuery = `DELETE FROM datasets WHERE id = '${datasetsId}';`;

  clientConnection.query(deleteQuery, (err, result) => {
    if (!err) {
      if (result.rowCount === 0) {
        res.status(404).send({
          "id": "api.dataset.delete",
          "ver": "1.0",
          "ts": new Date(),
          "params": {
            "err": "Data Not Found",
            "status": "unsuccessful",
            "errmsg": `Data with ID ${datasetsId} not found to delete.`
          },
          "responseCode": "NOT_FOUND",
          "result": null
        });
      } else {
        res.send({
          "id": "api.dataset.delete",
          "ver": "1.0",
          "ts": new Date(),
          "params": {
            "err": null,
            "status": "successful",
            "errmsg": null
          },
          "responseCode": "OK",
          "result": {
            "id": datasetsId
          }
        });
      }
    } else {
      res.status(500).send({
        "id": "api.dataset.delete",
        "ver": "1.0",
        "ts": new Date(),
        "params": {
          "err": "Database Error",
          "status": "unsuccessful",
          "errmsg": err.message
        },
        "responseCode": "INTERNAL_SERVER_ERROR",
        "result": null
      });
    }
  });
});
