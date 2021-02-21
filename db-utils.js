/**
 * Created by lixiaojian on 9/1/21.
 */
const rest = require('request')
const env = process.env.ENV


async function updateDb(sql, token) {
    console.log(sql)
    let url = `https://api.weixin.qq.com/tcb/databaseupdate?access_token=${token}`
    let body = {
        "env": env,
        "query": sql
    }
    return new Promise((resolve, reject) => {
        rest.post({
            url: url,
            json: true,
            headers: {
                "content-type": "application/json",
            },
            body: body
        }, (err, response, data) => {
            if (err) {
                console.log('request app err.', err)
                reject(err)
            } else {
                console.log(data)
                if(data.errcode === 0){
                    resolve(data)
                }else{
                    reject(data)
                }
            }
        })
    })
}

async function queryDb(sql, token) {
    console.log(sql)
    let url = `https://api.weixin.qq.com/tcb/databasequery?access_token=${token}`
    let body = {
        "env": env,
        "query": sql
    }
    return new Promise((resolve, reject) => {
        rest.post({
            url: url,
            json: true,
            headers: {
                "content-type": "application/json",
            },
            body: body
        }, (err, response, data) => {
            if (err) {
                console.log('request app err.', err)
                reject(err)
            } else {
                console.log(data.data)
                let list = data.data.map(item => JSON.parse(item))
                resolve(list)
            }
        })
    })
}

async function aggregateDb(sql, token) {
    console.log(sql)
    let url = `https://api.weixin.qq.com/tcb/databaseaggregate?access_token=${token}`
    let body = {
        "env": env,
        "query": sql
    }
    return new Promise((resolve, reject) => {
        console.time();
        rest.post({
            url: url,
            json: true,
            headers: {
                "content-type": "application/json",
            },
            body: body
        }, (err, response, data) => {
            if (err) {
                console.log('request app err.', err)
                reject(err)
            } else {
                console.log(data.data)
                let list = data.data.map(item => JSON.parse(item))
                resolve(list)
                console.timeEnd()
            }
        })
    })
}

module.exports = {
    queryDb: queryDb,
    updateDb: updateDb,
    aggregateDb: aggregateDb
}