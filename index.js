const rest = require('request')
const COS = require('cos-nodejs-sdk-v5')
const fs = require('fs')

const util = require('util')
const dbUtils = require('./db-utils.js')

var token = ''
var putObjectSync = null

!(async() => {
    console.time('sync-jd-script')
    console.log('====== start sync jd script =====')
    await main()
    console.log('====== end sync jd script =====')
    console.timeEnd('sync-jd-script')
})()


async function main() {
    token = await wxToken()
    let apiAuth = await qcloudToken(token)
    const cos = new COS({
        SecretId: apiAuth.secretid,
        SecretKey: apiAuth.secretkey,
        XCosSecurityToken: apiAuth.token
    })
    putObjectSync = util.promisify(cos.putObject.bind(cos))

    let appList = await getAppList()
    let configList = await getConfigList()

    console.log(appList)
    console.log(configList)

    console.log('run sync script start')

    await asyncPool(10, appList, app => new Promise(async(resolve) => {
        try {
            await upload(app, configList)
        } finally {
            resolve()
        }
    }))

}

async function upload(app, configList) {
    let script = app.script
    let config = configList.filter(item => item.name == script);
    if (config.length == 0) {
        return
    }

    let configItem = config[0]
    let appKeyJs = replaceAppKey(app.appKey)
    let scriptUrl = `${configItem.value}/${appKeyJs}.js`
    console.log(scriptUrl)
    let js = await gotJs(scriptUrl)

    if (js == null || js == '' || js == undefined) {
        console.log('got js is empty')
        return
    }

    let localJs = `/tmp/${app.appKey}.js`
    await fs.writeFileSync(localJs, `\ufeff${js}`, 'utf8', async(err) => {
        if (err) {
            console.log('write js err.', err)
        } else {
            console.log('write js ok')
        }
    })

    let cloudPath = `${app.appKey}.js`

    const params = {
        // 桶名
        Bucket: process.env.SCRIPT_BUCKET,
        Region: 'ap-guangzhou',
        // 桶对象
        Key: cloudPath,
        // 文件
        Body: fs.readFileSync(localJs)
    }
    await putObjectSync(params)
}

async function getConfigList() {
    let querySql = `db.collection('config')
        .aggregate()
        .match({
            type: 'script'
        })
        .limit(100)
        .end()`

    let list = await dbUtils.aggregateDb(querySql, token)
    return list
}

async function getAppList() {

    let querySql = `db.collection('share_app')
        .aggregate()
        .match({
            subscribe: true
        })
        .project({
            _id: 1,
            appKey: 1,
            subscribe: 1,
            script: 1
        })
        .limit(100)
        .end()`

    let list = await dbUtils.aggregateDb(querySql, token)
    return list
}


function replaceAppKey(appKey) {
    if (appKey == 'jd_sign') {
        return 'JD_DailyBonus'
    }

    return appKey
}

function asyncPool(poolLimit, array, iteratorFn) {
    let i = 0;
    const ret = [];
    const executing = [];
    const enqueue = function () {
        if (i === array.length) {
            return Promise.resolve();
        }
        const item = array[i++];
        const p = Promise.resolve().then(() => iteratorFn(item, array));
        ret.push(p);

        let r = Promise.resolve();

        if (poolLimit <= array.length) {
            const e = p.then(() => executing.splice(executing.indexOf(e), 1));
            executing.push(e);
            if (executing.length >= poolLimit) {
                r = Promise.race(executing);
            }
        }

        return r.then(() => enqueue());
    };
    return enqueue().then(() => Promise.all(ret));
}

module.exports = asyncPool;

async function qcloudToken(token) {
    let url = `https://api.weixin.qq.com/tcb/getqcloudtoken?access_token=${token}`
    let body = {
        "lifespan": 7200
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
                if (data.errcode == 0) {
                    resolve(data)
                } else {
                    reject(data)
                }
            }
        })
    })
}

async function wxToken() {
    return new Promise((resovle, reject) => {
        rest.get({
            url: process.env.TOKEN_URL
        }, (err, response, data) => {
            if (err) {
                console.log('request token err.', err)
                reject(err)
            } else {
                resovle(data)
            }
        })
    })
}

async function gotJs(url) {
    return new Promise((resovle, reject) => {
        rest.get({
            url: url
        }, (err, response, data) => {
            console.log('response status code -> ' + response.statusCode)
            if (err) {
                console.log('request js err.', err)
                reject(err)
            } else {
                console.log('request js ok')
                resovle(data)
            }
        })
    })
}