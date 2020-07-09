const moment = require('moment-timezone');

const numericCurrentTime = () => {
    let curr = moment().tz('Asia/Kolkata').format("YYYYMMDDHHmm");
    return "-" + curr;
}

const reverseJSON = (obj) => {
    let revObj = new Object;
    let objKeys = Object.keys(obj);
    for (var i = objKeys.length - 1; i >= 0; i--) {
        revObj[objKeys[i]] = obj[objKeys[i]];
    }
    return revObj;
}

const getKeysObj = (name, desc, email) => {
    let objKeys = {}
    let keys = new Array;
    const regEx = /[ .:;?!#$~%,@^*`"&|()<>{}\[\]\r\n/\\]+/;
    let keysName = name.toLowerCase().split(regEx);
    let keysDesc = desc.toLowerCase().split(regEx);
    keys = keys.concat(keysName);
    keys = keys.concat(keysDesc);
    keys.push(email.split("@")[0].split(".")[0]);
    keys.forEach(key => {
        if (key != '') {
            objKeys[key] = true;
        }
    })
    return objKeys;
}

const dateTimeNum = (date, time) => {
    return -1 * Number(date.split('/').reverse().join("") + time.replace(':', ''));
}

module.exports = {
    numericCurrentTime,
    reverseJSON,
    getKeysObj,
    dateTimeNum
};