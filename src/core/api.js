async function getAuthCode(cookie) {
    return await fetch(
        "https://accounts.ea.com/connect/auth?client_id=sparta-backend-as-user-pc&response_type=code&release_type=none",
        {
            method: "get",
            headers: {
                Cookie: cookie,
            },
            redirect: "manual",
        }
    );
}

async function getEnvIdViaAuthCode(authCode) {
    return await fetch("https://sparta-gw.battlelog.com/jsonrpc/pc/api", {
        method: "post",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            jsonrpc: "2.0",
            method: "Authentication.getEnvIdViaAuthCode",
            params: {
                authCode,
                locale: "zh-tw",
            },
            id: null,
        }),
    });
}

async function getPersonasByIds(pid) {
    return await fetch("https://sparta-gw.battlelog.com/jsonrpc/pc/api", {
        method: "post",
        headers: {
            "Content-Type": "application/json",
            "X-GatewaySession": global.sessionId,
        },
        body: JSON.stringify({
            jsonrpc: "2.0",
            method: "RSP.getPersonasByIds",
            params: {
                game: "tunguska",
                personaIds: [pid],
            },
            id: null,
        }),
    });
}

export { getAuthCode, getEnvIdViaAuthCode, getPersonasByIds };
