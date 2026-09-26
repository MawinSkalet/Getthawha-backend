import dotenv from "dotenv";
import {googleConfigErrors} from "../services/google.config";
dotenv.config({path:process.argv[2] || ".env"});
const errors=googleConfigErrors();
if(errors.length){console.error("Google OAuth is not ready:");for(const error of errors) console.error("- "+error);process.exitCode=1;}
else console.log("Google OAuth configuration is valid. Complete a real Google sign-in to verify credentials and consent settings.");
