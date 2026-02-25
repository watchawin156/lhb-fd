// functions/api/_middleware.ts
// CORS middleware สำหรับทุก API route

export const onRequest: PagesFunction = async ({ next }) => {
    const response = await next();
    const newResponse = new Response(response.body, response);
    newResponse.headers.set('Access-Control-Allow-Origin', '*');
    newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    return newResponse;
};
