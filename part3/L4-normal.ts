// ========================================================
// L4 normal eval
import { Sexp } from "s-expression";
import { map, apply } from "ramda";
import { CExp, Exp, IfExp, Program, parseL4Exp, VarDecl, LetExp, Binding, LetrecExp, ProcExp, isLetExp, isLetrecExp } from "./L4-ast";
import { isAppExp, isBoolExp, isCExp, isDefineExp, isIfExp, isLitExp, isNumExp,
         isPrimOp, isProcExp, isStrExp, isVarRef } from "./L4-ast";
import { applyEnv, makeEmptyEnv, Env, makeExtEnv, makeRecEnv } from './L4-env-normal';
import { applyPrimitive } from "./evalPrimitive";
import { Promise, isClosure, makeClosure, Value, Closure , makePromise, isPromise} from "./L4-value"
import { first, rest, isEmpty} from '../shared/list';
import { Result, makeOk, makeFailure, bind, mapResult, isOk } from "../shared/result";
import { parse as p } from "../shared/parser";

export const L4normalEval = (exp: CExp, env: Env): Result<Value> =>
    isBoolExp(exp) ? makeOk(exp.val) :
    isNumExp(exp) ? makeOk(exp.val) :
    isStrExp(exp) ? makeOk(exp.val) :
    isPrimOp(exp) ? makeOk(exp) :
    isLitExp(exp) ? makeOk(exp.val) :
    isVarRef(exp) ? bind(applyEnv(env, exp.var), (v: Value) =>  (isPromise(v) && !isAppExp(v.exp)) ? promiseToValue(v) : makeOk(v)):
    isIfExp(exp) ? evalIf(exp, env) :
    isProcExp(exp) ? makeOk(makeClosure(exp.args, exp.body, env)) :
    isLetExp(exp) ? evalLet(exp, env) :
    isAppExp(exp) ? bind(L4normalEval(exp.rator, env), proc => L4normalApplyProc(proc, exp.rands, env)) :
    makeFailure(`Bad ast: ${exp}`);

export const evalExps = (exps: Exp[], env: Env): Result<Value> =>
    isEmpty(exps) ? makeFailure("Empty expsuence") :
    isDefineExp(first(exps)) ? evalDefineExps(first(exps), rest(exps), env) :
    evalCExps(first(exps), rest(exps), env);

const evalDefineExps = (def: Exp, exps: Exp[], env: Env): Result<Value> =>
    (isDefineExp(def) && isProcExp(def.val)) ? evalExps(exps, makeRecEnv([def.var.var], [def.val.args], [def.val.body], env)) :
    isDefineExp(def) ? evalExps(exps, makeExtEnv([def.var.var], [makePromise(def.val, env)], env)) :
    makeFailure("Unexpected " + def)

const evalCExps = (exp1: Exp, exps: Exp[], env: Env): Result<Value> =>
    isCExp(exp1) && isEmpty(exps) ? L4normalEval(exp1, env) :
    isCExp(exp1) ? bind(L4normalEval(exp1, env), _ => evalExps(exps, env)) :
    makeFailure("Never");

const evalIf = (exp: IfExp, env: Env): Result<Value> =>
    bind(bind(L4normalEval(exp.test, env), (test: Value)=>promiseToValue(test)), (res: Value) => res === true ? evalExps([exp.then], env) : evalExps([exp.alt], env))
        

const evalLet = (exp: LetExp, env: Env): Result<Value> => {
    const vals: CExp[] = map((b: Binding) => b.val, exp.bindings);
    const vars: string[] = map((binding: Binding) => binding.var.var, exp.bindings);
    return evalExps(exp.body, makeExtEnv(vars, vals.map((val: CExp) => makePromise(val, env)), env));
}
        
export const evalNormalProgram = (program: Program): Result<Value> =>
    evalExps(program.exps, makeEmptyEnv());

export const evalNormalParse = (s: string): Result<Value> =>
    bind(p(s),
         (parsed: Sexp) => bind(parseL4Exp(parsed),
                                (exp: Exp) => evalExps([exp], makeEmptyEnv())));


const L4normalApplyProc = (proc: Value, args: CExp[], env: Env): Result<Value> => 
    isPromise(proc) ? bind(promiseToValue(proc), (rat: Value) => applyProc(rat, args, env)) :
                        applyProc(proc, args, env)

const applyProc = (proc: Value, args: CExp[], env: Env): Result<Value> => 
    isPrimOp(proc) ? bind(evalArgs(args, env), (args: Value[]) => applyPrimitive(proc, args)) :
    isClosure(proc) ? applyClosure(proc, args, env) :
    makeFailure(`Bad proc applied ${proc}`)
    

const evalArgs = (args : CExp[], env:Env) : Result<Value[]> =>
    mapResult((arg) => bind(L4normalEval(arg, env), (v:Value) => promiseToValue(v)), args);

const applyClosure = (proc: Closure, args: CExp[], env: Env): Result<Value> => {
    const vars: string[] = map((v: VarDecl) => v.var, proc.params); 
    return bind(evalExps(proc.body, makeExtEnv(vars, args.map((arg: CExp) => makePromise(arg, env)), proc.env)), (v:Value) => promiseToValue(v));
}

const promiseToValue = (v : Value) : Result<Value> =>
    isPromise(v) ? bind(L4normalEval(v.exp, v.env), (res: Value) => promiseToValue(res)) : makeOk(v)
