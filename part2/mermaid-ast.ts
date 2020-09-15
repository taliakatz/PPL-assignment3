/*
<graph> ::= <header> <graphContent>                     // Graph(dir: Dir, content: GraphContent)
<header> ::= graph (TD|LR)<newline>                     // Direction can be TD or LR
<graphContent> ::= <atomicGraph> | <compoundGraph>
<atomicGraph> ::= <nodeDecl>
<compoundGraph> ::= <edge>+
<edge> ::= <node> --><edgeLabel>? <node><newline>       // <edgeLabel> is optional
                                                        // Edge(from: Node, to: Node, label?: string)
<node> ::= <nodeDecl> | <nodeRef>
<nodeDecl> ::= <identifier>["<string>"]                 // NodeDecl(id: string, label: string)
<nodeRef> ::= <identifier>                              // NodeRef(id: string)
<edgeLabel> ::= |<identifier>|                          // string
*/


export type Dir = TD | LR;
export type TD = "TD";
export type LR = "LR";
export type GraphContent = atomicGraph | compoundGraph;
export type node = nodeDecl | nodeRef;
export type edgeLabel = string

export interface atomicGraph {tag: "atomicGraph"; content: nodeDecl};
export interface compoundGraph {tag: "compoundGraph"; content: edge[]};


export interface Graph {tag:"Graph"; dir: Dir; content: GraphContent; }
export interface nodeDecl {tag: "nodeDecl", id: string, label: string};
export interface nodeRef {tag: "nodeRef", id: string};
export interface edge {tag: "edge" ,from: node, to: node, label?: edgeLabel};

export const makeGraph = (dir: Dir, content: GraphContent) : Graph => ({tag: "Graph",dir: dir, content: content});
export const makeAtomicGraph = (node: nodeDecl) : atomicGraph => ({tag: "atomicGraph", content: node});
export const makeCompoundGraph = (edges: edge[]) : compoundGraph => ({tag: "compoundGraph", content: edges});

export const makeNodeDecl = (id: string, label: string) : nodeDecl => ({tag: "nodeDecl",id: id, label: label});
export const makeNodeRef = (id: string) : nodeRef => ({tag: "nodeRef", id: id});
export const makeEdge = (from: node, to: node, label?: edgeLabel) : edge => ({tag: "edge", from: from, to: to, label: label})

export const isGragh = (x: any): x is Graph => x.tag === "Graph";
export const isNodeDecl = (x: any): x is nodeDecl => x.tag === "nodeDecl";
export const isNodeRef = (x: any): x is nodeRef => x.tag === "nodeRef";
export const isEdge = (x: any): x is edge => x.tag === "edge";
export const isAtomicGraph = (x: any): x is atomicGraph => x.tag === "atomicGraph";
export const isCompoundGraph = (x: any): x is compoundGraph => x.tag === "compoundGraph";

