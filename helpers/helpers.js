const numericCurrentTime = () => {
    let time = new Date().toString().split(/[ :]/g);
    let isoTime = new Date().toISOString().split(/[-T]/g);
    let inNumber = -1 * Number(isoTime[0]+isoTime[1]+isoTime[2]+time[4]+time[5]);
    return inNumber;
}

const reverseJSON = (obj) => {
    let revObj = new Object;
    let objKeys = Object.keys(obj);
    for (var i=objKeys.length-1; i>=0; i--){
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
    keys = keys.concat(keysName); keys = keys.concat(keysDesc); keys.push(email.split("@")[0].split(".")[0]);
    keys.forEach(key => {
        if (key!=''){
            objKeys[key] = true;
        }
    })
    return objKeys;
}

const dateTimeNum = (date, time) => {
    return -1 * Number(date.split('/').reverse().join("") + time.replace(':',''));
}

module.exports = { numericCurrentTime, reverseJSON, getKeysObj, dateTimeNum };