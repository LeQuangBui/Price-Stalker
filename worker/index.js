//
// Proxy MEGA S4 compatible API requests, sending notifications to a webhook
//
// Adapted from https://github.com/obezuk/worker-signed-s3-template

import { AwsClient } from 'aws4fetch'

const aws = new AwsClient({
    "accessKeyId": AWS_ACCESS_KEY_ID,
    "secretAccessKey": AWS_SECRET_ACCESS_KEY,
    "region": AWS_DEFAULT_REGION,
    "service": "s3"
});


addEventListener('fetch', function (event) {
    event.respondWith(handleRequest(event.request))
});

function isListBucketRequest(path) {
    return path.length === 0;
}

async function handleRequest(request) {

    // Only allow GET and HEAD methods
    if (request.method !== "GET" && request.method !== "HEAD") {
        return new Response("Method Not Allowed", {
            status: 405,
            headers: { "Allow": "GET, HEAD" }
        });
    }

    var url = new URL(request.url);

    // Canonicalize to a single object key: strip leading/trailing slashes and collapse
    // repeated slashes, then write it back so the list-bucket check and the signed request
    // operate on the SAME key (no `//` / encoded-slash ambiguity or cache splitting).
    let path = url.pathname.replace(/^\/+/, '').replace(/\/+$/, '').replace(/\/{2,}/g, '/');
    url.pathname = '/' + path;

    // We only ever serve object bytes by key. Drop any caller-supplied query string so it
    // can't be signed as an S3 sub-resource / override (?acl, ?tagging, ?versionId,
    // ?response-content-disposition, ...) — that would turn this public image proxy into an
    // arbitrary S3 API gateway under our credentials.
    url.search = '';

    // Reject list bucket requests unless configuration allows it
    if (isListBucketRequest(path) && ALLOW_LIST_BUCKET !== "true") {
        return new Response(null, {
            status: 404,
            statusText: "Not Found"
        });
    }
    url.hostname = `${AWS_S3_BUCKET}.s3.${AWS_DEFAULT_REGION}.megas4.com`;

    // Sign with the ORIGINAL method so a client HEAD stays a HEAD upstream (not a GET that
    // fetches + caches the whole object). NB: do not log signedRequest — its headers include
    // the SigV4 Authorization signature, which must not leak into Cloudflare Worker logs.
    var signedRequest = await aws.sign(url, { "method": request.method });

    // Cache successful objects at the edge, but never cache errors/misses — a transient
    // upstream 404/5xx must not get pinned and turn a momentary miss into a sticky one.
    var response = await fetch(signedRequest, {
        "cf": {
            "cacheEverything": true,
            "cacheTtlByStatus": { "200-299": 86400, "300-399": 0, "400-599": 0 }
        }
    });

    // Never return raw S4 error bodies/headers to clients — a 403 SignatureDoesNotMatch body
    // echoes the access key ID, and error XML can expose bucket/key/request-id internals.
    // Map any failure to a clean, uncacheable response.
    if (!response.ok) {
        return new Response(null, {
            status: response.status === 404 ? 404 : 502,
            headers: { "Cache-Control": "no-store" }
        });
    }

    return response;
}