const test=require('node:test'),assert=require('node:assert/strict');
const {parseRange}=require('../terminal-sketch/http-range');
test('media ranges support playback, seeking and suffix requests',()=>{
 assert.equal(parseRange(undefined,100),null);
 assert.deepEqual(parseRange('bytes=0-9',100),{start:0,end:9});
 assert.deepEqual(parseRange('bytes=10-',100),{start:10,end:99});
 assert.deepEqual(parseRange('bytes=-10',100),{start:90,end:99});
 assert.deepEqual(parseRange('bytes=10-1000',100),{start:10,end:99});
 for(const range of ['bytes=100-','bytes=2-1','bytes=-0','bytes=-','bytes=0-1,3-4','bytes=9007199254740992-'])assert.equal(parseRange(range,100),false,range);
 assert.equal(parseRange('bytes=0-',0),false);
});
