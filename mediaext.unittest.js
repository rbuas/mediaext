global.ROOT_DIR = process.cwd() || __dirname;

var expect = require("chai").expect;
var assert = require("chai").assert;
var MediaExt = require("./mediaext");

describe("unit.mediaext", function() {
    var tests = {
        "RBUAS20150310-0052" : {
            file : ROOT_DIR + "/rocks/mediaext/test/images/web/RBUAS20150310-0052.jpg",
            info : {
                author:"Rodrigo Buás",
                authoremail:"rodrigobuas@gmail.com",
                authorrating:4,
                authorsite:"rbuas.com",
                copyright:"rbuas",
                orientation:"P",
                label:"Blue",
                tags:["2015", "Efet", "Luna Ornellas", "Paris", "dance", "rbuas", "shadow"],
                width:1536,
                height:2048
            }
        },
        "RBUAS20161022-0034" : {
            file : ROOT_DIR + "/rocks/mediaext/test/images/web/RBUAS20161022-0034.jpg",
            info : {
                author:"Rodrigo Buás",
                authoremail:"rodrigobuas@gmail.com",
                authorrating:3,
                authorsite:"rbuas.com",
                copyright:"rbuas",
                label:"Green",
                orientation:"P",
                tags: ["key1", "key2", "key3", "rbuas"],
                title: "poubelle à longueville",
                type: "jpg",
                xres: 72,
                yres: 72,
                caption: "vu de la fenetre vers une poubelle à longueville",
                model: "Canon EOS 7D",
                modelserial: "1070704906",
                ex: 0.008,
                fn: 6.7,
                iso: 400,
                wb: "Custom",
                lens: "EF50mm f/1.2L USM",
                focal: 50,
                city: "Longueville",
                state: "Île-de-France",
                countrycode: "FR",
                country: "France",
                altitude: 85.9782,
                latitude: [48, 30.816, 0],
                longitude: [3, 15.0137, 0],
                width:1365,
                height:2048
            }
        },
        "IMG_0531_ed" : {
            file : ROOT_DIR + "/rocks/mediaext/test/images/web/IMG_0531_ed.jpg",
            info : {id:"IMG_0531_ed"}
        }
    };

    describe("readFile", function() {
        it("must to read a file and compare the expected properties", function(done) {
            var tid = "RBUAS20150310-0052";
            var tconfig = tests[tid];
            MediaExt.readFile(tconfig.file)
            .then(function(mediainfo) {
                expect(mediainfo).to.be.ok;
                var totest = mediainfo.pick(Object.keys(tconfig.info));
                expect(totest).to.be.deep.equal(tconfig.info);
                done();
            })
            .catch(done);
        });

        it("must to read a file and compare the expected properties of RBUAS20161022-0034", function(done) {
            var tid = "RBUAS20161022-0034";
            var tconfig = tests[tid];
            MediaExt.readFile(tconfig.file)
            .then(function(mediainfo) {
                expect(mediainfo).to.be.ok;
                var totest = mediainfo.pick(Object.keys(tconfig.info));
                expect(totest).to.be.deep.equal(tconfig.info);
                done();
            })
            .catch(done);
        });

        it("must to read a file and compare the expected properties of IMG_0531_ed", function(done) {
            var tid = "IMG_0531_ed";
            var tconfig = tests[tid];
            MediaExt.readFile(tconfig.file)
            .then(function(mediainfo) {
                expect(mediainfo).to.be.ok;
                expect(mediainfo.id).to.be.equal(tconfig.info.id);
                expect(mediainfo.author).to.not.be.ok;
                done();
            })
            .catch(done);
        });

        it("must to read a tif file with basic properties", function(done) {
            MediaExt.readFile(ROOT_DIR + "/rocks/mediaext/test/images/web/IMG_0531.tif")
            .then(function(mediainfo) {
                expect(mediainfo).to.be.ok;
                expect(mediainfo.id).to.be.equal("IMG_0531");
                expect(mediainfo.width).to.be.ok;
                expect(mediainfo.height).to.be.ok;
                done();
            })
            .catch(done);
        });

        it("must to not read a non existent file", function(done) {
            MediaExt.readFile(ROOT_DIR + "/rocks/mediaext/test/images/web/filenotexistent.tif")
            .then(function(mediainfo) {
                done(new Error("should not pass here, because the readFile have to fail when file is a tif"));
            })
            .catch(function(err) {
                expect(err).to.be.ok;
                expect(err.error).to.be.equal(MediaExt.ERROR.FILENOTFOUND);
                done();
            })
            .catch(done);
        });

    });
});