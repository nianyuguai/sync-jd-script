const rest = require('request')


!(async() => {
    console.time('sync-jd-script')
    console.log('====== start sync jd script =====')
    let res = await main()
    console.timeEnd('sync-jd-script')
})()


async function main() {
    let url = `https://jdsharedresourcescdn.azureedge.net/jdresource/jd_redPacket.js`
    await gotJs(url)
    let cosUrl = `https://scripts-1255594201.file.myqcloud.com/jd_bean_change.js`
    await gotJs(cosUrl)
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
                console.log(data)
                resovle()
            }
        })
    })
}