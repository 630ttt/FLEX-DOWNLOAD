import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTesseractTsv } from '../src/utils/ocrText.js';

test('groups OCR words into lines and maps doubled-resolution boxes back to source pixels', () => {
  const tsv = [
    'level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext',
    '5\t1\t1\t1\t1\t1\t20\t40\t80\t24\t92.0\tHAPPY',
    '5\t1\t1\t1\t1\t2\t110\t42\t70\t22\t88.0\tBIRTHDAY',
    '5\t1\t1\t1\t2\t1\t45\t100\t35\t20\t8.0\t@',
  ].join('\n');

  assert.deepEqual(parseTesseractTsv(tsv, 2), [
    { text: 'HAPPY BIRTHDAY', confidence: 90, bbox: { x: 10, y: 20, width: 80, height: 12 } },
  ]);
});

test('drops low-confidence OCR noise before creating editable text', () => {
  const tsv = [
    'level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext',
    '5\t1\t1\t1\t1\t1\t10\t20\t60\t18\t88.0\tHAPPY',
    '5\t1\t1\t1\t2\t1\t5\t60\t12\t12\t23.0\t@',
    '5\t1\t1\t1\t3\t1\t80\t60\t40\t16\t38.0\tHic',
  ].join('\n');

  assert.deepEqual(parseTesseractTsv(tsv, 1, 40).map((line) => line.text), ['HAPPY']);
});