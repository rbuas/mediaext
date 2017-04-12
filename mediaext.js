module.exports = MediaExt = {};

var fs = require("fs");
var path = require("path");
var exif = require("fast-exif");
var imagesize = require("image-size");
var sax = require("sax");
var sharp = require("sharp");
var jsext = require("jsext");


MediaExt.EXPORT_FORMAT = {
    id : "file.basename",
    type : "file.type",
    height : "file.height",
    width : "file.width",
    orientation : "file.orientation",
    path : "file.path",

    xres : "media.XResolution",
    yres : "media.YResolution",
    model : "media.Model",
    modelserial : "exif.BodySerialNumber",
    focal : "exif.FocalLength",
    lens : "exif.LensModel",
    iso : "exif.ISO",
    ex : "exif.ExposureTime",
    fn : "exif.FNumber",
    creation : "exif.DateTimeOriginal",//"xmp.createdate"
    temperature : "xmp.temperature",
    wb : "xmp.wb",
    profile : "xmp.profile",

    author : "xmp.author",
    usageterms : "xmp.usageterms",
    authoremail : "xmp.authoremail",
    authorsite : "xmp.authorsite",
    copyright : "xmp.copyright",
    authorrating : "xmp.authorrating",
    title : "xmp.title",
    caption : "xmp.description",
    label : "xmp.label",
    tags : "xmp.tags",
    city : "xmp.city",
    state : "xmp.state",
    country : "xmp.country",
    countrycode : "xmp.countrycode",

    latitude : "gps.GPSLatitude",
    longitude : "gps.GPSLongitude",
    altitude : "gps.GPSAltitude",
};

MediaExt.XMP_PROPERTIES = {
    "x:xmpmeta/rdf:RDF/rdf:Description/dc:creator/rdf:Seq/rdf:li" : "author",
    "x:xmpmeta/rdf:RDF/rdf:Description/dc:title/rdf:Alt/rdf:li" : "title",
    "x:xmpmeta/rdf:RDF/rdf:Description/dc:rights/rdf:Alt/rdf:li" : "copyright",
    "x:xmpmeta/rdf:RDF/rdf:Description/dc:description/rdf:Alt/rdf:li" : "description",
    "x:xmpmeta/rdf:RDF/rdf:Description/dc:subject/rdf:Bag/rdf:li" : "tags",
    "x:xmpmeta/rdf:RDF/rdf:Description/xmpRights:UsageTerms/rdf:Alt/rdf:li" : "usageterms",
    "x:xmpmeta/rdf:RDF/rdf:Description/xmp:CreateDate" : "createdate",
    "x:xmpmeta/rdf:RDF/rdf:Description/xmp:Rating" : "authorrating",
    "x:xmpmeta/rdf:RDF/rdf:Description/xmp:Label" : "label",
    "x:xmpmeta/rdf:RDF/rdf:Description/photoshop:City" : "city",
    "x:xmpmeta/rdf:RDF/rdf:Description/photoshop:State" : "state",
    "x:xmpmeta/rdf:RDF/rdf:Description/photoshop:Country" : "country",
    "x:xmpmeta/rdf:RDF/rdf:Description/Iptc4xmpCore:CountryCode" : "countrycode",
    "x:xmpmeta/rdf:RDF/rdf:Description/crs:WhiteBalance" : "wb",
    "x:xmpmeta/rdf:RDF/rdf:Description/crs:Temperature" : "temperature",
    "x:xmpmeta/rdf:RDF/rdf:Description/crs:CameraProfile" : "profile",
    "x:xmpmeta/rdf:RDF/rdf:Description/Iptc4xmpCore:CreatorContactInfo/Iptc4xmpCore:CiEmailWork" : "authoremail",
    "x:xmpmeta/rdf:RDF/rdf:Description/Iptc4xmpCore:CreatorContactInfo/Iptc4xmpCore:CiUrlWork" : "authorsite",
};

MediaExt.CONVERTION = {
    authorrating : function(val) { return val && Number(val); }
}

MediaExt.VERSIONS = {
    web : {quality : 100, width : 2048},
    low : {quality : 100, width : 1024},
    mob : {quality : 90, width : 480},
    thumb : {quality : 80, width : 120},
    tiny : {quality : 60, width : 3}
};

MediaExt.MIME = {
    jpg : "image/jpeg",
    gif : "image/gif",
    png : "image/png"
}

MediaExt.ERROR = {
    MISSING_PARAMS : "Missing required params",
    FILENAME : "Missing media file name parameter",
    FILENOTFOUND : "Media file not found",
    XMPREAD : "Internal error during XMP read",
    EXIFREAD : "Internal error during EXIT read",
    NODIR : "Can not found the directory"
};

MediaExt.readFile = function (mediafile) {
    return new Promise(function(resolve, reject) {
        if(!mediafile) return reject({error:MediaExt.ERROR.MISSING_PARAMS}, null);

        if(!jsext.fileExists(mediafile)) return reject({error:MediaExt.ERROR.FILENOTFOUND});

        var error = [];

        Promise.all([
            MediaExt.readFileinfo(mediafile)
            .then(function(datafile) {
                return {file : datafile};
            })
            .catch(function(err) { error.push(err); }),

            MediaExt.readExif(mediafile)
            .then(function(data) {
                return { exif :  data && data.exif, media : data && data.image, gps : data && data.gps };
            })
            .catch(function(err) { error.push(err); }),

            MediaExt.readXMP(mediafile)
            .then(function(dataxmp) {
                return { xmp : dataxmp };
            })
            .catch(function(err) { error.push(err); })
        ])
        .then(function(dataparts) {
            var mediainfo = Object.assign(dataparts[0], dataparts[1], dataparts[2]);
            var formatedinfo = mediainfo.format(MediaExt.EXPORT_FORMAT);
            resolve(formatedinfo);
        })
        .catch(reject);
    });
}

MediaExt.readFileinfo = function (mediafile) {
    return new Promise(function(resolve, reject) {
        mediafile = path.normalize(mediafile);
        if(!mediafile) return reject({error:MediaExt.ERROR.FILENAME});

        var extension = path.extname(mediafile);
        var filetype = extension.replace(".", "");
        var basename = path.basename(mediafile, extension);
        var filedir = path.dirname(mediafile);

        var filestats = fs.statSync(mediafile);
        if(!filestats || !filestats.isFile()) return reject({error:MediaExt.ERROR.FILENOTFOUND, mediafile:mediafile});

        var filecreation = filestats.birthtime;
        try {
            var dimensions = imagesize(mediafile);
        } catch(e) {
            console.log("MEDIAEXT::WARNING: can not read image dimensions of ", mediafile);
        }

        var width = dimensions && dimensions.width;
        var height = dimensions && dimensions.height;
        var orientation = width && height && width > height ? "L" : "P";

        var info = {
            path : filedir,
            basename : basename,
            type : filetype,
            filecreation : filecreation,
            width : width,
            height : height,
            orientation : orientation,
        };
        resolve(info);
    });
}

MediaExt.readExif = function (mediafile) {
    return new Promise(function(resolve, reject) {
        mediafile = path.normalize(mediafile);
        if(!mediafile) return reject({error:MediaExt.ERROR.FILENAME});

        exif.read(mediafile, true)
        .then(function (data) {
            resolve(data);
        })
        .catch(function (error) {
            reject({error:MediaExt.ERROR.EXIFREAD, internalerror:error});
        });
    });
}

MediaExt.readXMP = function (mediafile) {
    return new Promise(function(resolve, reject) {
        mediafile = path.normalize(mediafile);
        if(!mediafile) return reject({error:MediaExt.ERROR.FILENAME});

        jsext.extractFromFile(mediafile, "<x:xmpmeta", "</x:xmpmeta>")
        .then(function (data) {
            return parseXMP(data);
        })
        .then(function(parseddata) {
            resolve(parseddata);
        })
        .catch(function (error) {
            reject({error:MediaExt.ERROR.XMPREAD, internalerror:error});
        });
    });
}

MediaExt.generateVersion = function (filepath, version, destination, versions) {
    return new Promise(function(resolve, reject) {
        if(!filepath || !version || !destination) return reject({error:MediaExt.ERROR.MISSING_PARAMS, filepath:filepath, version:version, destination:destination})

        versions = versions || MediaExt.VERSIONS;
        var config = typeof(version) == "object" ? version : versions[version];
        if(!config) return reject({error:MediaExt.ERROR.UNKNOWN_CONFIG, config:config});

        var destinationDir = path.dirname(destination);
        try {
            var stats = fs.statSync(destinationDir);
        } catch (e) {
            fs.mkdirSync(destinationDir);
        }

        var sharpfile = sharp(filepath);
        if(config.width) {
            sharpfile.resize(config.width, config.width);
            sharpfile.max();
        }
        sharpfile.jpeg({quality:config.quality || 100});
        sharpfile.withMetadata();
        sharpfile.toFile(destination, function (err, info) {
            if(err) return reject({error:MediaExt.ERROR.WRITEFILE, internalerror:err});

            resolve({version:version, info:info});
        });
    });
}

MediaExt.generateVersions = function (dir, file, master, versions) {
    return new Promise(function(resolve, reject) {
        if(!dir || !file) return reject({error:MediaExt.ERROR.MISSING_PARAMS, dir:dir, file:file});

        master = master || "";
        var filepath = path.normalize(path.join(dir, master, file));

        versions = versions || MediaExt.VERSIONS;
        var tasks = Object.keys(versions).map(function(version) {
            if(version == master) return;

            var destination = path.normalize(path.join(dir, version, file));
            return MediaExt.generateVersion(filepath, version, destination, versions);
        });
        return Promise.all(tasks).then(resolve, reject);
    });
}

MediaExt.scrapdir = function (dir, filetypes) {
    return new Promise(function(resolve, reject) {
        if(!dir) return reject({error:MediaExt.ERROR.MISSING_PARAMS});

        dir = path.normalize(dir);
        if(!jsext.isDir(dir)) return reject({error:MediaExt.ERROR.NODIR, dir:dir});

        var files = jsext.listDir(dir, filetypes);
        if(!files || files.length == 0) return resolve(files);

        var tasks = files.map(function(file) {
            return MediaExt.readFile(path.join(dir, file));
        });
        return Promise.all(tasks)
        .then(function(mediainfos) {
            var validmedias = mediainfos.filter(function (mediainfo) {
                return mediainfo && mediainfo.id;
            });
            resolve(validmedias);
        })
        .catch(reject);
    });
}

MediaExt.mimetype = function (type) {
    if(!type) return;
    return MediaExt.MIME[type];
}



// PRIVATE

function parseXMP (data) {
    return new Promise(function(resolve, reject) {
        var parserstrict = true;
        var parser = sax.parser(parserstrict);

        var nodepath = [];
        var currentnode = null;
        var outdata = {};

        parser.onerror = function (err) { reject({error:MediaExt.ERROR.PARSEXML, internalerror:err}) };
        parser.onopentag = function (node) {
            nodepath.push(node.name);
            if(node.attributes) {
                for(var att in node.attributes) {
                    if(!node.attributes.hasOwnProperty(att))
                        continue;

                    var value = node.attributes[att];
                    nodepath.push(att);
                    setOutdata(nodepath, value, outdata);
                    nodepath.pop();
                }
            }
            currentnode = node;
        }
        parser.onclosetag = function (node) {
            nodepath.pop();
            currentnode = null;
        }
        parser.ontext = function (value) {
            setOutdata(nodepath, value, outdata);
        }
        parser.onend = function (data) { resolve(outdata) };
        parser.write(data).close();
    });
}

function setOutdata (nodepath, value, outdata) {
    value = value && value.trim();
    if(!nodepath || !outdata || !value)
        return;

    var currentpath = nodepath.join("/");
    var prop = currentpath && MediaExt.XMP_PROPERTIES[currentpath];
    if(!currentpath || !prop)
        return;

    var convertion = MediaExt.CONVERTION[prop];
    if(convertion) {
        value = convertion(value);
    }

    var old = outdata[prop];
    if(!old)
        outdata[prop] = value;
    else if(Array.isArray(old))
        outdata[prop].push(value);
    else
        outdata[prop] = [old, value];
}