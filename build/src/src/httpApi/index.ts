import fs from "fs";
import path from "path";
import crypto from "crypto";
import express from "express";
import fileUpload from "express-fileupload";
import cors from "cors";
import params from "../params";
import { listContainers } from "../modules/docker/listContainers";
import signWithPrivateKey from "../utils/sign";

import * as db from "../db";
import Logs from "../logs";
const logs = Logs(module);

const app = express();
const port = 3000;

/**
 * HTTP API
 *
 * [NOTE] This API is not secure
 * - It can't use HTTPS for the limitations with internal IPs certificates
 */

const adminIpPrefix = "172.33.10.";
const tempTransferDir = params.TEMP_TRANSFER_DIR;

// default options. ALL CORS + limit fileSize and file count
app.use(
  fileUpload({
    limits: { fileSize: 500 * 1024 * 1024, files: 10 }
  })
);
app.use(cors());

app.get("/", async (req, res) => {
  return res.send("Welcome to the DAPPMANAGER HTTP API");
});

/**
 * Endpoint to download files.
 * File must be previously available at the specified fileId
 * - Only available to admin users
 */
app.get("/download/:fileId", async (req, res) => {
  // Protect for a range of IPs, req.ip = "::ffff:172.33.10.1";
  if (!req.ip.includes(adminIpPrefix))
    return res.status(403).send(`Forbidden ip: ${req.ip}`);

  const { fileId } = req.params;
  const filePath = db.fileTransferPath.get(fileId);

  // If path does not exist, return error
  if (!filePath) return res.status(404).send("File not found");

  // Remove the fileId from the DB FIRST to prevent reply attacks
  db.fileTransferPath.remove(fileId);
  return res.download(filePath, errHttp => {
    if (!errHttp)
      fs.unlink(filePath, errFs => {
        if (errFs) logs.error(`Error deleting file: ${errFs.message}`);
      });
  });
});

/**
 * Endpoint to upload files.
 * Any file type and size will be accepted
 * A fileId will be provided afterwards to be used in another useful call
 * - Only available to admin users
 */
app.post("/upload", (req, res) => {
  // Protect for a range of IPs, req.ip = "::ffff:172.33.10.1";
  if (!req.ip.includes(adminIpPrefix))
    return res.status(403).send(`Forbidden ip: ${req.ip}`);

  if (!req.files || typeof req.files !== "object")
    return res.status(400).send("Argument files missing");
  if (Object.keys(req.files).length == 0)
    return res.status(400).send("No files were uploaded.");

  const fileId = crypto.randomBytes(32).toString("hex");
  const filePath = path.join(tempTransferDir, fileId);

  // Use the mv() method to place the file somewhere on your server
  // The name of the input field (i.e. "file") is used to retrieve the uploaded file
  const file = Array.isArray(req.files.file)
    ? req.files.file[0]
    : req.files.file;
  file.mv(filePath, err => {
    if (err) return res.status(500).send(err);

    db.fileTransferPath.set(fileId, filePath);
    res.send(fileId);
    // Delete the file after 15 minutes
    setTimeout(() => {
      fs.unlink(filePath, errFs => {
        if (errFs) logs.error(`Error deleting file: ${errFs.message}`);
      });
    }, 15 * 60 * 1000);
  });
});

app.get("/sign", async (req, res) => {
  const data = req.query.data;
  try {
    if (typeof data === undefined) throw Error("missing");
    if (typeof data !== "string") throw Error("must be a string");
    if (!data) throw Error("must not be empty");
  } catch (e) {
    return res.status(400).send(`Arg data ${e.message}`);
  }

  // Find IPv4 adresses only, this is a IPv6 to IPv4 prefix
  const ipv4 = req.ip.replace("::ffff:", "");
  const dnps = await listContainers();
  const dnp = dnps.find(_dnp => _dnp.ip === ipv4);
  if (!dnp) return res.status(405).send(`No DNP found for ip ${ipv4}`);

  return res.status(200).send(signWithPrivateKey(dnp.name + ":" + data));
});

app.listen(port, () => logs.info(`HTTP API ${port}!`));

export {};
