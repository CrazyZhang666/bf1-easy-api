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
        console.log("读取文件时发生错误 ", error.message);
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
        console.log("写入文件时发生错误 ", error.message);
    }
}

async function refreshRemidSid() {
    await getAccountInfo();

    const cookie = `remid=${account.remid};sid=${account.sid};`;
    const response = await getAuthCode(cookie);

    let location = response.headers.get("location");
    if (location.match("fid=")) {
        throw new Error("remid或sid失效, 请重新填写");
    } else {
        account.authCode = location.replace(/.*code=(.*)/, "$1");
        const newCookie = response.headers.get("set-cookie").split(";");
        for (let i = 0; i < newCookie.length; i++) {
            if (newCookie[i].startsWith("remid=")) {
                account.remid = newCookie[i].split("=")[1];
            } else if (newCookie[i].startsWith("sid=")) {
                account.sid = newCookie[i].split("=")[1];
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
        console.log("刷新sessionId成功");

        await setAccountInfo();
    } else {
        console.log("刷新sessionId出错");
    }
}

async function refresh() {
    console.log("开始执行获取remid和sid...");
    await refreshRemidSid();

    console.log("开始执行获取sessionId...");
    await refreshSessionId();

    cron.schedule("0 0 */12 * * *", () => {
        console.log(new Date().toLocaleString() + " 每12小时刷新sessionId");
        refreshSessionId();
    });

    cron.schedule("0 0 0 */7 * *", () => {
        console.log(new Date().toLocaleString() + " 每7天刷新remid和sid");
        refreshRemidSid();
    });
}

export { refresh };
