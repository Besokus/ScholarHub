import{i as o}from"./index-5b5873b3.js";const t={list:async()=>{const r=await fetch(`${o}/courses`);if(!r.ok)throw new Error("HTTP error");return r.json()}};export{t as C};
