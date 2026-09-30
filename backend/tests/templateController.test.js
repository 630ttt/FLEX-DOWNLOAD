const test = require('node:test');
const assert = require('node:assert/strict');
const Template = require('../models/Template');
const { listPublishedTemplates, getPublishedTemplate } = require('../controllers/templateController');

const responseRecorder = () => ({
  statusCode: 200,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

test('public template list only queries published records', async () => {
  const originalFind = Template.find;
  let filter;
  Template.find = (query) => {
    filter = query;
    return {
      select() { return this; },
      sort() { return this; },
      lean: async () => [],
    };
  };
  try {
    const res = responseRecorder();
    await listPublishedTemplates({}, res);
    assert.deepEqual(filter, { status: 'published' });
    assert.equal(res.body.success, true);
  } finally { Template.find = originalFind; }
});

test('public detail lookup includes published status and hides drafts', async () => {
  const originalFindOne = Template.findOne;
  let filter;
  Template.findOne = (query) => {
    filter = query;
    return { lean: async () => null };
  };
  try {
    const res = responseRecorder();
    await getPublishedTemplate({ params: { id: '0123456789abcdef01234567' } }, res);
    assert.deepEqual(filter, { _id: '0123456789abcdef01234567', status: 'published' });
    assert.equal(res.statusCode, 404);
  } finally { Template.findOne = originalFindOne; }
});