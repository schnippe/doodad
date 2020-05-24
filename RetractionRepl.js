"use strict";
const baseHeight = 2.4;
const defaultRetraction = 1.0;


let fs = require('fs');

(function (filename) {
    console.log("reading "+filename+".gcode");
    let src = fs.readFileSync(filename+".gcode").toString();
    filename+="new.gcode"
    let dst=src.replace(/^(G1 F[0-9.]* E)([0-9].*)(\nG1 F[0-9.]* Z[^]*?^G1 F[0-9.]* Z)([0-9.]*)(\nG1 F[0-9.]* E)([0-9].*)$/gm,
     (match, p1, retraction, p2, zPos, p3, reretraction) => {
        const fzPos = parseFloat(zPos) - baseHeight;
        let fretraction = parseFloat(retraction)+defaultRetraction; // remove default retraction
      fretraction -= fzPos<0 ? defaultRetraction: fzPos/4.0; // match retraction to quarter z height above base
      return p1+fretraction.toFixed(5)+p2+zPos+p3+reretraction
    });
    fs.writeFileSync(filename, dst);
    console.log(filename+" written.")
})('/home/marcel/Dokumente/3dPrint/gcode/distance_towers_v3');


