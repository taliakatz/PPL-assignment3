import { Result, mapResult, makeOk, makeFailure, isOk, bind, safe2, safe3 } from "../shared/result";
import { Graph, makeEdge, GraphContent, makeNodeDecl, node, makeNodeRef, makeGraph, edge, makeAtomicGraph, compoundGraph, makeCompoundGraph, isAtomicGraph, isCompoundGraph, isNodeDecl, isNodeRef } from "./mermaid-ast";
import { DefineExp, isProgram, isBoolExp, isNumExp, isProcExp, ProcExp, isStrExp, isVarRef, isPrimOp, isDefineExp, isIfExp, isAppExp, Exp, CExp, makeDefineExp, isCExp, isAtomicExp, AppExp, Parsed, AtomicExp, IfExp, CompoundExp, VarDecl, Program, isExp, isLitExp, isLetrecExp, isSetExp, LitExp, isLetExp, LetExp, Binding, SetExp, LetrecExp, parseL4, parseL4Exp } from "./L4-ast";
import { isEmpty} from "ramda";
import { makeVarGen } from "../L3/substitute";
import { isCompoundSExp, isSymbolSExp, CompoundSExp, SExpValue, isEmptySExp, valueToString} from "./L4-value";
import { first, rest} from "../shared/list";
import { isUndefined } from "util";
import { parse } from "../shared/parser";

const programVarGen = makeVarGen();
const expsVarGen = makeVarGen();
const defineVarGen = makeVarGen();
const varDeclVarGen = makeVarGen();
const numExpVarGen = makeVarGen();
const boolExpVarGen = makeVarGen();
const strExpVarGen = makeVarGen();
const primOpExpVarGen = makeVarGen();
const varRefExpVarGen = makeVarGen();
const appVarGen = makeVarGen();
const randsVarGen = makeVarGen();
const ifVarGen = makeVarGen();
const procExpVarGen = makeVarGen();
const paramsVarGen = makeVarGen();
const bodyVarGen = makeVarGen();
const bindingExpVarGen = makeVarGen();
const bindingsVarGen = makeVarGen();
const letExpVarGen = makeVarGen();
const letrecExpVarGen = makeVarGen();
const litExpVarGen = makeVarGen();
const setExpVarGen = makeVarGen();
const emptySexpVarGen = makeVarGen();
const symbolVarGen = makeVarGen();
const numberVarGen = makeVarGen();
const booleanVarGen = makeVarGen();
const stringVarGen = makeVarGen();
const compoundSexpVarGen = makeVarGen();


export const mapL4toMermaid = (exp: Parsed): Result<Graph> =>
    isEmpty(exp) ?  makeFailure("Expression can not be empty") :
    isProgram(exp) ? bind(L4ProgramToMermaid(exp), (value: GraphContent) => buildGraph(value)) ://makeOk(makeGraph("TD", value))) :
    isExp(exp) ? bind(L4ExpToMermaid(exp), (value: GraphContent) => buildGraph(value)) :
    makeFailure("unexpected type")

const buildGraph = (cont : GraphContent) : Result<Graph> =>
    isAtomicGraph(cont) ? makeOk(makeGraph("TD", cont)) :
    isCompoundGraph(cont) ? makeOk(makeGraph("TD", makeCompoundGraph([first(cont.content)].concat(rest(cont.content).map((edge: edge) => makeEdge(makeNodeRef(edge.from.id), edge.to, edge.label)))))):
    makeFailure("unexpected type")
    
const L4ProgramToMermaid = (exp : Program) : Result<GraphContent> => {
    const root = makeNodeDecl(programVarGen("Program"), "Program");
    const dots = makeNodeDecl(expsVarGen("Exps"), ":");
    const edge = makeEdge(makeNodeRef(root.id), dots, "exps");
    const res  = bind(mapResult(L4ExpToMermaid, exp.exps), (content: GraphContent[]) => connectSubGraph(content, dots))
    return bind(res, (graph: compoundGraph) => makeOk(makeCompoundGraph([edge].concat(graph.content))))
}

const L4ExpToMermaid = (exp : Exp) : Result<GraphContent> =>
    isDefineExp(exp) ? L4DefineExpToMermaid(exp) :
    L4CExpToMermaid(exp)

const L4DefineExpToMermaid = (exp : DefineExp) : Result<GraphContent> =>{
    const root = makeNodeDecl(defineVarGen("DefineExp"), "DefineExp");
    const var1 = makeNodeDecl(varDeclVarGen("VarDecl"), `"VarDecl(${exp.var})"`)
    const edge = makeEdge(root, var1, "val")
    const valGraph = bind(L4CExpToMermaid(exp.val), (content: GraphContent) => connectSubGraph([content], root));
    return bind(valGraph, (valG:compoundGraph)=>makeOk(makeCompoundGraph([edge].concat(valG.content))))
}

const L4CExpToMermaid = (exp : CExp) : Result<GraphContent> =>
    isAtomicExp(exp) ?  L4AtomiCExpToMermaid(exp) :
    L4CompoundCExpToMermaid(exp)
                
const L4VarDeclCExpToMermaid = (exp : VarDecl) : Result<GraphContent> =>
    makeOk(makeAtomicGraph(makeNodeDecl(varDeclVarGen("VarDecl"), `"VarDecl(${exp.var})"`)))
    
const L4AtomiCExpToMermaid = (exp : AtomicExp) : Result<GraphContent> => 
    isNumExp(exp) ? makeOk(makeAtomicGraph(makeNodeDecl(numExpVarGen("NumExp"), `"NumExp(${exp.val})"`))) :
    isBoolExp(exp) ? makeOk(makeAtomicGraph(makeNodeDecl(boolExpVarGen("BoolExp"), `"BoolExp(${exp.val})"`))) :
    isStrExp(exp) ? makeOk(makeAtomicGraph(makeNodeDecl(strExpVarGen("StrExp"), `"StrExp(${exp.val})"`))) :
    isPrimOp(exp) ? makeOk(makeAtomicGraph(makeNodeDecl(primOpExpVarGen("PrimOp"), `"PrimOp(${exp.op})"`))) :
    isVarRef(exp) ? makeOk(makeAtomicGraph(makeNodeDecl(varRefExpVarGen("VarRef"), `"VarRef(${exp.var})"`))) :
    makeFailure("unexpected type")


const appExpToMermaid = (exp : AppExp) : Result<GraphContent> =>{
    const root = makeNodeDecl(appVarGen("AppExp"), "AppExp");
    const dots = makeNodeDecl(randsVarGen("Rands"), ":");
    const edge = makeEdge(root, dots, "rands");
    return safe2((valG1:compoundGraph,valG2:compoundGraph) => makeOk(makeCompoundGraph(valG2.content.concat([edge]).concat(valG1.content))))
        (bind(mapResult(L4CExpToMermaid, exp.rands), (content: GraphContent[]) => connectSubGraph(content, dots)),
         bind(L4CExpToMermaid(exp.rator), (content: GraphContent) => connectSubGraph([content], root)))
}

const ifExpToMermaid = (exp : IfExp) : Result<GraphContent> =>{
    const root = makeNodeDecl(ifVarGen("IfExp"), "IfExp"); 
    return safe3((valG1:compoundGraph,valG2:compoundGraph,valG3:compoundGraph) => makeOk(makeCompoundGraph(valG1.content.concat(valG2.content).concat(valG3.content))))
        (bind(L4CExpToMermaid(exp.test), (content: GraphContent) => connectSubGraph([content], root, "test")),
         bind(L4CExpToMermaid(exp.then), (content: GraphContent) => connectSubGraph([content], root, "then")),
         bind(L4CExpToMermaid(exp.alt), (content: GraphContent) => connectSubGraph([content], root, "alt")))
}

const procExpToMermaid = (exp : ProcExp) : Result<GraphContent> =>{
    const root = makeNodeDecl(procExpVarGen("ProcExp"), "ProcExp");
    const dots1 = makeNodeDecl(paramsVarGen("Params"), ":");
    const dots2 = makeNodeDecl(bodyVarGen("Body"), ":");
    const edge1 = makeEdge(root, dots1, "args");
    const edge2 = makeEdge(root, dots2, "body");     
    return safe2((valG1:compoundGraph,valG2:compoundGraph) => makeOk(makeCompoundGraph([edge1, edge2].concat(valG1.content.concat(valG2.content)))))
        (bind(mapResult(L4VarDeclCExpToMermaid, exp.args), (content: GraphContent[]) => connectSubGraph(content, dots1)),
         bind(mapResult(L4CExpToMermaid, exp.body), (content: GraphContent[]) => connectSubGraph(content, dots2)))
}

const litExpToMermaid = (exp : LitExp) : Result<GraphContent> => {
    const root = makeNodeDecl(litExpVarGen("LitExp"), "LitExp");
    const resGraph = bind(sExpValueToMermaid(exp.val), (content: GraphContent) => connectSubGraph([content], root))
    return bind(resGraph, (valG1: compoundGraph) => makeOk(makeCompoundGraph(valG1.content)));
}

const letExpToMermaid = (exp : LetExp | LetrecExp) : Result<GraphContent> => {
    const root = isLetExp(exp) ? makeNodeDecl(letExpVarGen("LetExp"), "LetExp") : makeNodeDecl(letrecExpVarGen("LetrecExp"), "LetrecExp");
    const dots1 = makeNodeDecl(bindingsVarGen("Bindings"), ":");
    const dots2 = makeNodeDecl(bodyVarGen("Body"), ":");
    const edge1 = makeEdge(root, dots1, "bindings");
    const edge2 = makeEdge(root, dots2, "body");
    return safe2((valG1:compoundGraph,valG2:compoundGraph) => makeOk(makeCompoundGraph([edge1, edge2].concat(valG1.content.concat(valG2.content)))))
        (bind(mapResult(bindingExpToMermaid, exp.bindings), (content: GraphContent[]) => connectSubGraph(content, dots1)),
         bind(mapResult(L4CExpToMermaid, exp.body), (content: GraphContent[]) => connectSubGraph(content, dots2)))
}

const bindingExpToMermaid = (exp : Binding) : Result<GraphContent> => {
    const root = makeNodeDecl(bindingExpVarGen("Binding"), "Binding");
    return safe2((varG1:compoundGraph,valG2:compoundGraph) => makeOk(makeCompoundGraph(varG1.content.concat(valG2.content))))
            (bind(L4VarDeclCExpToMermaid(exp.var), (content: GraphContent) => connectSubGraph([content], root)),
             bind(L4CExpToMermaid(exp.val), (content: GraphContent) => connectSubGraph([content], root)))
}


const connectSubGraph = (cont: GraphContent[], root: node, label?: string) : Result<compoundGraph> =>
    makeOk(makeCompoundGraph(cont.reduce((acc: edge[], curr: GraphContent) =>
        isAtomicGraph(curr) ? acc = acc.concat([makeEdge(root, curr.content, label)]) :
        isCompoundGraph(curr)? acc =  acc.concat([makeEdge(root, curr.content[0].from, label)]).concat(curr.content) :
        acc
    ,[])))

const L4CompoundCExpToMermaid = (exp : CompoundExp) : Result<GraphContent> => 
    isAppExp(exp) ? appExpToMermaid(exp) : 
    isIfExp(exp) ? ifExpToMermaid(exp) :
    isProcExp(exp) ? procExpToMermaid(exp) :
    isLitExp(exp) ? litExpToMermaid(exp) :
    isLetExp(exp) || isLetrecExp(exp) ? letExpToMermaid(exp) :
    isSetExp(exp) ? setExpToMermaid(exp) :
    makeFailure("unexpected")


const sExpValueToMermaid = (exp : SExpValue) : Result<GraphContent> => 
    isEmptySExp(exp) ? makeOk(makeAtomicGraph(makeNodeDecl(emptySexpVarGen("EmptySexp"), "EmptySexp"))) :
    isPrimOp(exp) ? L4AtomiCExpToMermaid(exp) :
    isSymbolSExp(exp) ? makeOk(makeAtomicGraph(makeNodeDecl(symbolVarGen("symbol"), `"symbol(${valueToString(exp)})"`))) :
    typeof(exp) === 'number' ? makeOk(makeAtomicGraph(makeNodeDecl(numberVarGen("number") ,`"number(${valueToString(exp)})"`))) :
    typeof(exp) === 'boolean' ? makeOk(makeAtomicGraph(makeNodeDecl(booleanVarGen("boolean"), `"boolean(${valueToString(exp)})"`))) :
    typeof(exp) === 'string' ? makeOk(makeAtomicGraph(makeNodeDecl(stringVarGen("string"), `"string(${valueToString(exp)})"`))) :
    isCompoundSExp(exp) ? compoundSexpToMermaid(exp) :
    makeFailure("unexpected type")


const compoundSexpToMermaid = (exp : CompoundSExp) : Result<GraphContent> => {
    const root = makeNodeDecl(compoundSexpVarGen("CompoundSExp"),"CompoundSExp");
    return safe2((valG1:compoundGraph,valG2:compoundGraph) => makeOk(makeCompoundGraph(valG1.content.concat(valG2.content))))
        (bind(sExpValueToMermaid(exp.val1), (content: GraphContent) => connectSubGraph([content], root, "test")),
         bind(sExpValueToMermaid(exp.val2), (content: GraphContent) => connectSubGraph([content], root, "then")))
}

const setExpToMermaid = (exp : SetExp) : Result<GraphContent> =>{
    const root  = makeNodeDecl(setExpVarGen("SetExp"), "SetExp");
    const var1 = makeNodeDecl(varRefExpVarGen("VarRef"), `"VarRef(${exp.var})"`)
    const valGraph = bind(L4CExpToMermaid(exp.val), (content: GraphContent) => connectSubGraph([content], root));
    const edge1 = makeEdge(root, var1, "var")
    return bind(valGraph, (valG1:compoundGraph) => makeOk(makeCompoundGraph([edge1].concat(valG1.content))))
}

export const unparseMermaid = (exp: Graph): Result<string> =>
    isAtomicGraph(exp.content) ? makeOk(`graph ${exp.dir}\n${exp.content.content.id}[${exp.content.content.label}]`) : //maybe we need to chang to /"
    isCompoundGraph(exp.content) ? makeOk(compoundGraphToString(exp.content.content, exp.dir)) :
    makeFailure("unexpected type")

const compoundGraphToString = (edges: edge[], dir: string) : string =>
    edges.reduce((acc, curr) => isNodeDecl(curr.from) &&  isNodeDecl(curr.to) ? (
            isUndefined(curr.label) ? acc = acc.concat(`${curr.from.id}[${curr.from.label}] --> ${curr.to.id}[${curr.to.label}]\n`) :
            acc = acc.concat(`${curr.from.id}[${curr.from.label}] -->|${curr.label}| ${curr.to.id}[${curr.to.label}]\n`)
            ):
            isNodeRef(curr.from) &&  isNodeDecl(curr.to) ? (
            isUndefined(curr.label) ? acc = acc.concat(`${curr.from.id} --> ${curr.to.id}[${curr.to.label}]\n`) :
            acc = acc.concat(`${curr.from.id} -->|${curr.label}| ${curr.to.id}[${curr.to.label}]\n`)
            ):
            acc ,"graph " + dir + "\n")

export const L4toMermaid = (concrete: string): Result<string> =>{
    const resProgram = parseL4(concrete)
    if(isOk(resProgram))
        return bind(bind(resProgram, mapL4toMermaid), unparseMermaid)
    const resExp = bind(parse(concrete), parseL4Exp)
    return bind(bind(resExp, mapL4toMermaid), unparseMermaid)
}