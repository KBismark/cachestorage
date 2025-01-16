// A simple node.js server that serves the current directory using http-server

const http = require("http");
const path = require("path");
const url = require("url");
const fs = require("fs");
const port = 8089;

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url);
  let pathname = `${parsedUrl.pathname}`;
    console.log(pathname);
    
  // Serve index.html if pathname is /
  if ([ "/", "/index.html"].includes(pathname)) {
    pathname = "./index.html";

    // Serve index.html
    return fs.readFile(path.join(__dirname, pathname), (err, data) => {
      if (err) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.write("404 Not Found");
        res.end();
      } else {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.write(data);
        res.end();
      }
    });

  }

  // Serve cls.js if pathname is /cls.js
    if (["/cls.js", "/main.js"].includes(pathname)) {
        // pathname = "./cls.js";

        // Serve cls.js
        return fs.readFile(path.join(__dirname, pathname), (err, data) => {
            if (err) {
                res.writeHead(404, { "Content-Type": "text/plain" });
                res.write("404 Not Found");
                res.end();
            } else {
                res.writeHead(200, { "Content-Type": "application/javascript" });
                res.write(data);
                res.end();
            }
        });
    }


    // Serve ../dist/index.js if pathname is /dist/index.js
    if (pathname === "/dist/index.js") {
        pathname = "../dist/index.js";

        // Serve ../dist/index.js
        return fs.readFile(path.join(__dirname, pathname), (err, data) => {
            if (err) {
                res.writeHead(404, { "Content-Type": "text/plain" });
                res.write("404 Not Found");
                res.end();
            } else {
                res.writeHead(200, { "Content-Type": "application/javascript" });
                res.write(data);
                res.end();
            }
        });
    }

    console.log('Reached here', pathname);
    
    // Anything else
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.write("404 Not Found");
    res.end();
 
});



server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
