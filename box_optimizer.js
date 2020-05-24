"use strict";

/*
minimizing material offcuts, e.g. for boxes with same depth and individual widths         
method: anealed mutation of single locally optimal dna                                    
                _____________________________________________                             
material: n x  /___part____/_______________part__________/oc/ materialWidth => BoxHeights 
                                materialLength                                            
boxes:          __________                                                                
               /         /|                                      _________________        
 partLength[0]/         //|             ___________             /                /|       
    ==Depth  /         ///|            /          /|           /                //|       
            /_________////|           /          //|          /                ///|       
            |_________|///|          /          ///|         /________________////|       
            |_________|///|         /__________////|         |________________|///|       
boxHeight[0]|_________|////  box    |__________|////  box    |________________|////       
     == 6   |_________|/// Height[1]|__________|/// Height[2]|________________|///        
            |_________|//    == 4   |__________|//    == 5   |________________|//         
            |_________|/            |__________|/            |________________|/          
            partLength[1]            partLength[2]              partLength[3]             

partList: 
___________
|_Index 0__|  x 30,
______________
|__Index 1___|  x 8 ...

*/
// Sum reducer
const sum = (acc, cur) => acc+cur

//#region Edit this: 
// makes output more readable
const unit="m"

// source material to be cut optimally
const materialLength=3.0

// first partLength[0] == depth of Box, partLength[1] == width of first Box, ...
const partLength=[0.90,1.0,1.10,1.20] 

// measured in width of material 
const boxHeight=[6,5,4] 

// How many parts are needed? Overwrite this, to remove box logic!
const partList=[boxHeight.reduce(sum)*2,...boxHeight.map ((val)=>val*2)] 

// exponential slowdown of mutability (s-slope),
// e.g. 1e-5 took 17 seconds and did 340k steps
//      1e-6 did 10 times more
const coolingFactor = 1e-4
//#endregion custom fields done.

// unused, replaced by live update of local variable
// reduce function generator for summation of products
const prodSum = (secondArray) => (acc, cur, idx) => acc+secondArray[idx]*cur
// applying function for offcut calculation
const offcut = (material, partLength) => materialLength-partLength.reduce(prodSum(material),0)

class cMaterial extends Array { // TODO: possibly change Array inheritance to compositon to hide implementation detail
    
    /* 
     construct a new BOM as an instance of a project in progress
     a genome is (kind of) a temporally orderd list of part id's
     as a string: '03011101023031' but the parts are always cut
     from spare offcuts first, which yields an optimized genome.
     After filing a genome the BOM and the cutoffs are calculated.
    */
    constructor(genome) { 
        super(Array())
        this.fileGenome (genome)
        this.originalGenome = genome
    }
    newItem () {
        this[this.length]=new Array(partLength.length)
        this[this.length-1].fill(0)
        this[this.length-1].offcut=materialLength
        return this[this.length-1]
    }
    addPart (idx) {
        let item= // where should we cut from?
            this.find( // algorithm: reuse first matching offcut when adding a part, yields normally near optimum results
                (material)=>material.offcut+0.0001>=partLength[idx] // match not quite equal floats fuzzily, produces -0.0 artefact
                ) || // or else
            this.newItem() // no spare? buy more material.
        item[idx]++ // add part to database
        item.offcut=Math.max (0,item.offcut-partLength[idx]) // update offcut, cap negative zero floating point artefact to +0.0
    }
    fileGenome (genome) { // a genome is a list of part id's as a string: '00011101023033'
        this.length=0 // empty array parent 
        for (let i=0; i<genome.length; i++) {
            this.addPart (genome[i]*1) //'1'=>1
        }
    }
    
    /*
     returns the alogoritmically optimzied genome (cool description bro!)
     by reducing the arry description to a string
    */
    getGenome () { 
        return this.reduce ((acc,cur)=>acc+cur.reduce((acc,cur,idx)=>acc+(idx+"").repeat(cur),""),"")
    }
    /*
     Summation of offcuts, for statistics
    */
    getOffcutsLength () {
        return this.reduce ((acc,item)=>acc+item.offcut,0)
    }
    /*
     Fitness is defined ∑ offcuts² if material count is equal.This will maximise offcuts size.
    */
    getFitness () {
        return this.reduce ((acc,item)=>acc+item.offcut*item.offcut,0)
    }
    /*
     this functions decides which of two projects was more effective
    */
    isFitterThan (other) {
        if (this.length<other.length) 
            return true
        if (this.length==other.length)
            return this.getFitness() > other.getFitness()
        return false
    }
    /*
     formates output for a how-to-cut list
    */
    toString () {
        return this.length +" items of material needed / "+
            this.getGenome().length+" parts,"+
            " fitness: "+this.getFitness().toFixed(2)+unit+"² "+
            this.getOffcutsLength().toFixed(2)+unit+" offcuts\n"+ // remove sign from -0
/*/ add "/" at first char to activate debug output. Remove to deactivate
            "("+this.getGenome()+")\n"+
            "("+this.originalGenome+")\n"+
//*/
            this.reduce((materialDesc,item)=>{
                const desc=item.reduce((itemDesc, partCount, partType) =>
                    itemDesc+= (partCount!=0?(itemDesc==""?"":", ")+partCount+" x "+partLength[partType].toFixed(2)+unit:''),'')
                materialDesc[materialDesc.length] = desc + ', offcut: '+item.offcut.toFixed(2)+unit // remove sign from -0
                return materialDesc
        }, []).sort().join('\n')
    }
}


String.prototype.shuffle = function (count=-1, first=0, last=-1) {
/*
 shuffles part of a substring, but only a specific number of characters
  => returns a shuffled string
 "abcdefgh".shuffle(3) => "abfdcegh"
                             # ##  
  shuffle is usable mutation function, because it does not destory
  the partlist.
*/
    // normalize parameters
    // loop negativ index-paramters to end of string
    const bindRange=(min,val,max)=>
      val<min?
        Math.max(min,Math.min(max,max-min+val+1)):
        Math.max(min,Math.min(max,val))
    first=bindRange (0,first,this.length-1)
    last=bindRange (0,last,this.length-1)
    ;[first,last]=[Math.min(first,last),Math.max(first,last)]       // order first and last
    count=bindRange (0,count,last-first+1)

    let array=this.split(""),                                       // convert string to array of chars
        mix=[...Array(last-first+1).keys()]                           // generates array with natural numbers as char indizes
    const swap=(array,a,b)=>array[b]=array.splice(a,1,array[b])[0]  // swap array items by using splice return array item

    mix.forEach ((val,idx,mix)=>
        swap(mix,idx, Math.floor(Math.random()*mix.length)))        // mix all indizes to keep chances for all chars equal
    mix=mix.slice(0,count)    
    mix.forEach ((val,idx)=>
        swap (array,mix[idx],mix[idx+1>=mix.length?0:idx+1]))       // mix first count chars by randomized indizes
    return array.join("");
}

class cCooldown  {
/*
    capsulates the mutation rate cooldown mechanism and support data
*/
    constructor (genomeSize) {
        this.mutationFactor=1
        this.genomeSize=genomeSize
        this.stepsTaken=0
        this.startupTimestamp=Date.now ()
    }
    /*
      returns integer number of bases to mutate, follows exponential s-slope
    */
    getMutationSize() {return Math.floor (this.genomeSize*this.mutationFactor)}

    /*
        cools mutation factor down, generates exponetial s-slope.
    */
    timestep () {
        const oldMutationsrate=this.getMutationSize()
        this.mutationFactor=this.mutationFactor*(1.0-coolingFactor)
        this.stepsTaken++
        if (oldMutationsrate!=this.getMutationSize()) {
            console.log ("Mutationsrate: "+(this.mutationFactor*100).toFixed(2)+"%")
        }
    }
    getStats () {
        return "mutations were frozen, after "+this.stepsTaken+" steps and "+((Date.now()-this.startupTimestamp)/1000).toFixed(2)+" seconds."
    }
}

const Run=()=>{
    // build genome string from partList
    let genome=partList.reduce((acc,cur,idx)=>acc+(""+idx).repeat(cur),"")

    // try two known god candidates
    const Lo=new cMaterial (genome)
    const Hi=new cMaterial ([...genome].reverse().join(''))

    let Optimum=Lo.isFitterThan(Hi)?Lo:Hi
    console.log(Optimum.toString())

    let coolDown = new cCooldown (genome.length)
    do {
       let test = new cMaterial (Optimum.getGenome().shuffle(coolDown.getMutationSize()))
       if (test.isFitterThan (Optimum)) {
        Optimum = test;
        console.log(Optimum.toString())
       }
       coolDown.timestep()
      }
    while (coolDown.getMutationSize()>1) // needs two to shuffle
    console.log(Optimum.toString())
    console.log (coolDown.getStats())
}

Run()

/*
20 items of material needed / 60 parts, fitness: 0.10m² 0.40m offcuts
1 x 0.90m, 1 x 1.00m, 1 x 1.10m, offcut: 0.00m
1 x 0.90m, 1 x 1.00m, 1 x 1.10m, offcut: 0.00m
1 x 0.90m, 1 x 1.00m, 1 x 1.10m, offcut: 0.00m
1 x 0.90m, 1 x 1.00m, 1 x 1.10m, offcut: 0.00m
1 x 0.90m, 1 x 1.00m, 1 x 1.10m, offcut: 0.00m
1 x 0.90m, 1 x 1.00m, 1 x 1.10m, offcut: 0.00m
1 x 0.90m, 1 x 1.00m, 1 x 1.10m, offcut: 0.00m
1 x 0.90m, 1 x 1.00m, 1 x 1.10m, offcut: 0.00m
1 x 0.90m, 1 x 1.00m, 1 x 1.10m, offcut: 0.00m
1 x 0.90m, 1 x 1.00m, 1 x 1.10m, offcut: 0.00m
1 x 0.90m, 2 x 1.00m, offcut: 0.10m
2 x 0.90m, 1 x 1.20m, offcut: 0.00m
2 x 0.90m, 1 x 1.20m, offcut: 0.00m
2 x 0.90m, 1 x 1.20m, offcut: 0.00m
2 x 0.90m, 1 x 1.20m, offcut: 0.00m
2 x 0.90m, 1 x 1.20m, offcut: 0.00m
2 x 0.90m, 1 x 1.20m, offcut: 0.00m
2 x 0.90m, 1 x 1.20m, offcut: 0.00m
2 x 0.90m, 1 x 1.20m, offcut: 0.00m
3 x 0.90m, offcut: 0.30m

*/