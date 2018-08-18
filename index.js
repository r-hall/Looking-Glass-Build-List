const buildList = require('./buildList.js');

exports.handler = async (event) => {
    // TODO implement
    console.log('event', event);
    let records = event['Records'];
    let lists = [];
    let promiseArray = [];
    for (let i = 0; i < records.length; i++) {
        let messageArr = records[i]['body'].split('.');
        let list = messageArr[0];
        let user = messageArr[1];
        lists.push(list);
        promiseArray.push(buildList(user, list));
    }
    await Promise.all(promiseArray);
    return `done with lists: ${lists.join(', ')}`
};