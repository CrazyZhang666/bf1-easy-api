import fs from "fs/promises";
import cron from "node-cron";
import { getAuthCode, getEnvIdViaAuthCode } from "./api.js";

const filePath = "./src/db/account.json";

const account = {
    remid: "",
    sid: "",
    authCode: "",
    sessionId: "",
};

function isEmptyStr(str) {
    if (str == undefined || str == null || str == "") {
        return true;
    }
    return false;
}

async function getAccountInfo() {
    try {
        const data = await fs.readFile(filePath, "utf-8");

        const json = JSON.parse(data);
        if (!isEmptyStr(json.remid)) account.remid = json.remid;
        if (!isEmptyStr(json.sid)) account.sid = json.sid;
        if (!isEmptyStr(json.authCode)) account.authCode = json.authCode;
        if (!isEmptyStr(json.sessionId)) account.sessionId = json.sessionId;
    } catch (error) {
        console.log("read account.json file error! ", error.message);
    }
}

async function setAccountInfo() {
    try {
        await fs.writeFile(
            filePath,
            JSON.stringify(account, null, "\t"),
            "utf-8"
        );
    } catch (error) {
        console.log("write account.json file error! ", error.message);
    }
}

async function refreshRemidSid() {
    await getAccountInfo();

    const cookie = `remid=${account.remid};sid=${account.sid};`;
    const response = await getAuthCode(cookie);

    let location = response.headers.get("location");
    if (location.match("fid=")) {
        throw new Error(
            "remid or sid is invalid, please check account.json file!"
        );
    } else {
        account.authCode = location.replace(/.*code=(.*)/, "$1");
        const newCookie = response.headers.get("set-cookie").split(";");
        for (let i = 0; i < newCookie.length; i++) {
            if (newCookie[i].startsWith("remid=")) {
                account.remid = newCookie[i].split("=")[1];
                console.log("refresh remid success!");
            } else if (newCookie[i].startsWith("sid=")) {
                account.sid = newCookie[i].split("=")[1];
                console.log("refresh sid success!");
            }
        }

        await setAccountInfo();
    }
}

async function refreshSessionId() {
    await getAccountInfo();

    const response = await getEnvIdViaAuthCode(account.authCode);

    if (response.status == 200) {
        const data = await response.json();
        account.sessionId = data.result.sessionId;
        global.sessionId = account.sessionId;
        console.log("refresh sessionId success!");

        await setAccountInfo();
    } else {
        console.log("refresh sessionId error!");
    }
}

async function refresh() {
    console.log("run refresh remid and sid task...");
    await refreshRemidSid();

    console.log("run refresh sessionId task...");
    await refreshSessionId();

    cron.schedule("0 0 */12 * * *", () => {
        console.log(
            `${new Date().toLocaleString()} every 12 hours run auto refresh sessionId task...`
        );
        refreshSessionId();
    });

    cron.schedule("0 0 0 */7 * *", () => {
        console.log(
            `${new Date().toLocaleString()} every 7 days run auto refresh remid and sid task...`
        );
        refreshRemidSid();
    });
}

export { refresh };
