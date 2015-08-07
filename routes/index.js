var express = require('express');
var router = express.Router();
var Imap = require('imap');
var config = require("./config")
var inspect = require("util").inspect;
var fs = require('fs');

/* GET home page. */
var unread = 0;
var read = 0;
var attachments = 0;
var all = 0;
var noattachments = 0;
var mimeType = [];

var imap = new Imap(config);

var attachmentsArr =  [];


function findAttachments(struct) {
   // var attachmentsArr = attachmentsArr || [];
    console.log('===> ', attachmentsArr);
    for (var i = 0, len = struct.length ; i < len; ++i) {
        if (Array.isArray(struct[i])) {
            findAttachments(struct[i]);
        } else {
            if (struct[i].disposition && ['ATTACHMENT'].indexOf(struct[i].disposition.type) > -1) {

               attachmentsArr.push(struct[i]);
            }
        }

    }
    //console.log("MONK!",attachmentsArr);


    return attachmentsArr;
}



function openInbox(cb) {
    imap.openBox('INBOX', true, cb);
}

imap.once('ready', function() {

    openInbox(function(err, box) {
        if (err) throw err;
        imap.search([ 'UNSEEN', ['SINCE', 'Jan 01, 2015'] ], function(err, results) {
            //   var unread = 0;
            if (err) throw err;
            var f = imap.fetch(results, { bodies: '' });
            f.on('message', function(msg, seqno) {

                msg.on('body', function(stream, info) {
                    //     console.log(prefix + 'Body');
                    stream.pipe(fs.createWriteStream('msg-' + seqno + '-body.txt'));
                });

                msg.once('end', function() {
                    //  console.log(prefix + 'Finished');
                    // console.log(seqno);
                    unread = seqno;
                });
            });
            f.once('error', function(err) {
                console.log('Fetch error: ' + err);
            });
            f.once('end', function() {
                console.log("Done fetching " + unread + " unread messages!");
                imap.end();
            });
        });
        imap.search([ 'SEEN', ['SINCE', 'Jan 01, 2015'] ], function(err, results) {
            // var read = 0;
            if (err) throw err;
            var f = imap.fetch(results, { bodies: '' });
            f.on('message', function(msg, seqno) {

                msg.on('body', function(stream, info) {
                    //     console.log(prefix + 'Body');
                    stream.pipe(fs.createWriteStream('msg-' + seqno + '-body.txt'));
                });

                msg.once('end', function() {
                    //  console.log(prefix + 'Finished');
                    // console.log(seqno);
                    read = seqno;
                });
            });
            f.once('error', function(err) {
                console.log('Fetch error: ' + err);
            });
            f.once('end', function() {
                console.log("Done fetching " + read + " read messages!");
                imap.end();
            });
        });
        imap.search([ 'ALL', ['SINCE', 'May 20, 2010'] ], function(err, results) {
            if (err) throw err;
            var f = imap.fetch(results, {
                bodies: 'HEADER.FIELDS (FROM TO SUBJECT DATE)',
                struct: true
            });
            f.on('message', function(msg, seqno) {
                console.log('Message #%d', seqno);
                var prefix = '(#' + seqno + ') ';
                msg.on('body', function(stream, info) {
                   //   console.log(prefix + 'Body');
                    stream.pipe(fs.createWriteStream('msg-' + seqno + '-body.txt'));
                });
                msg.once('attributes', function(attrs) {

                    var arr = findAttachments(attrs.struct);
                    attachments = findAttachments(attrs.struct).length;
                    var arr2 = [];
                    var temp = {}
                    for(var i=0; i<arr.length; i++){
                        arr2.push({subtype: arr[i].subtype})
                    }
                   //console.log(arr2);
                    arr2.forEach(function(element, index, array){
                        if(temp[element.subtype] === undefined){
                            temp[element.subtype] = 1;
                        }
                        else {
                            temp[element.subtype]++;
                        }
                    });
                     mimeType = Object.getOwnPropertyNames(temp).map(function(e) { return { mime: e, count: temp[e] }});
                     console.log("MIME",mimeType);


                    //     console.log(prefix + 'Attributes: %s', inspect(attrs, false, 8));




                });


                msg.once('end', function() {
                    //  console.log(prefix + 'Finished');
                    all = seqno;
                    noattachments = all  - attachments;
                    console.log(all);
                    console.log(noattachments);
                    console.log(attachments);
                });
            });
            f.once('error', function(err) {
                console.log('Fetch error: ' + err);
            });
            f.once('end', function() {
                console.log('Done fetching all messages!');
                imap.end();
            });
        });


            });
        });

        imap.once('error', function(err) {
            console.log(err);
        });

        imap.once('end', function() {
            console.log('Connection ended');
        });

        imap.connect();


router.get('/', function(req, res, next) {

res.render('index', {title: 'GMAIL',
                     unread: unread,
                     read: read,
                     noattachments: noattachments,
                     attachments:attachments,
                     typeCount: mimeType.length,
                     mimeType: mimeType
});


  });

/*router.get('/attachments', function(req, res){
   res.render('attachments', {title: 'GMAIL Attachments', noattachments: noattachments, attachments:attachments});
});*/

module.exports = router;
