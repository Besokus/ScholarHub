"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSwagger = registerSwagger;
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
function registerSwagger(app) {
    const spec = (0, swagger_jsdoc_1.default)({
        definition: {
            openapi: '3.0.0',
            info: { title: 'ScholarHub API', version: '1.0.0' },
            servers: [{ url: 'http://localhost:3000' }],
            paths: {
                '/api/courses': {
                    get: { summary: 'List courses', responses: { '200': { description: 'OK' } } },
                    post: {
                        summary: 'Create course',
                        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' }, department: { type: 'string' }, teacherId: { type: 'integer' } }, required: ['name'] } } } },
                        responses: { '200': { description: 'OK' }, '400': { description: 'Invalid' } }
                    }
                },
                '/api/courses/{id}': {
                    get: { summary: 'Get course', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { '200': { description: 'OK' }, '404': { description: 'Not found' } } },
                    put: { summary: 'Update course', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], requestBody: { content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '200': { description: 'OK' }, '404': { description: 'Not found' } } },
                    delete: { summary: 'Delete course', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { '200': { description: 'OK' }, '404': { description: 'Not found' } } }
                },
                '/api/resources': {
                    get: {
                        summary: 'List resources',
                        parameters: [
                            { name: 'q', in: 'query', schema: { type: 'string' } },
                            { name: 'courseId', in: 'query', schema: { type: 'string' } },
                            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
                            { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 20 } }
                        ],
                        responses: { '200': { description: 'OK' } }
                    },
                    post: {
                        summary: 'Create resource',
                        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { title: { type: 'string' }, summary: { type: 'string' }, courseId: { type: 'string' }, fileUrl: { type: 'string' } }, required: ['title', 'summary', 'courseId', 'fileUrl'] } } } },
                        responses: { '200': { description: 'Created' }, '400': { description: 'Invalid' } }
                    }
                },
                '/api/resources/{id}': {
                    get: { summary: 'Get resource', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { '200': { description: 'OK' }, '404': { description: 'Not found' } } },
                    put: { summary: 'Update resource', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], requestBody: { content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '200': { description: 'OK' }, '404': { description: 'Not found' } } },
                    delete: { summary: 'Delete resource', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { '200': { description: 'OK' }, '404': { description: 'Not found' } } }
                },
                '/api/resources/{id}/downloads': {
                    post: { summary: 'Increment download', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { '200': { description: 'OK' }, '404': { description: 'Not found' } } }
                },
                '/api/resources/me/uploads': {
                    get: { summary: 'My uploads', responses: { '200': { description: 'OK' } } }
                },
                '/api/qa/questions': {
                    get: { summary: 'List questions', parameters: [{ name: 'courseId', in: 'query', schema: { type: 'string' } }, { name: 'status', in: 'query', schema: { type: 'string', enum: ['unanswered'] } }, { name: 'my', in: 'query', schema: { type: 'string', enum: ['1'] } }, { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } }, { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 15 } }], responses: { '200': { description: 'OK' } } },
                    post: { summary: 'Create question', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { courseId: { type: 'string' }, title: { type: 'string' }, contentHTML: { type: 'string' }, images: { type: 'array', items: { type: 'string' } } }, required: ['courseId', 'title', 'contentHTML'] } } } }, responses: { '200': { description: 'OK' }, '400': { description: 'Invalid' } } }
                },
                '/api/qa/questions/{id}': {
                    get: { summary: 'Get question', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { '200': { description: 'OK' }, '404': { description: 'Not found' } } },
                    put: { summary: 'Update question', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], requestBody: { content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '200': { description: 'OK' }, '404': { description: 'Not found' } } },
                    delete: { summary: 'Delete question', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { '200': { description: 'OK' }, '404': { description: 'Not found' } } }
                },
                '/api/questions/{id}/answers': {
                    get: { summary: 'List answers for question', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { '200': { description: 'OK' } } },
                    post: { summary: 'Create answer for question', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { content: { type: 'string' }, attachments: { type: 'string' } }, required: ['content'] } } } }, responses: { '200': { description: 'OK' }, '400': { description: 'Invalid' } } }
                },
                '/api/answers/{id}': {
                    get: { summary: 'Get answer', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { '200': { description: 'OK' }, '404': { description: 'Not found' } } },
                    delete: { summary: 'Delete answer', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { '200': { description: 'OK' }, '404': { description: 'Not found' } } }
                },
                '/api/notifications': {
                    get: { summary: 'List notifications', parameters: [{ name: 'type', in: 'query', schema: { type: 'string' } }, { name: 'status', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'OK' } } }
                },
                '/api/notifications/{id}/read': {
                    post: { summary: 'Mark one notification as read', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }], responses: { '200': { description: 'OK' }, '404': { description: 'Not found' } } }
                },
                '/api/notifications/read-all': {
                    post: { summary: 'Mark all notifications as read', responses: { '200': { description: 'OK' } } }
                }
            }
        },
        apis: []
    });
    app.use('/api/docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(spec));
}
