import dotenv from "dotenv";
import {readFileSync} from "node:fs";
import {googleConfigErrors} from "../services/google.config";
try {
  // An explicit file must be checked in isolation from Docker/shell variables.
  let env;
  if (process.argv[2]) env = dotenv.parse(readFileSync(process.argv[2]));
  else { dotenv.config(); env = process.env; }
  const errors = googleConfigErrors(env);
  if (errors.length) {
    console.error("Google OAuth is not ready:");
    for (const error of errors) console.error("- " + error);
    process.exitCode = 1;
  } else console.log("Google OAuth configuration is valid. Complete a real Google sign-in to verify credentials and consent settings.");
} catch {
  console.error("Unable to read the OAuth configuration file.");
  process.exitCode = 1;
}
