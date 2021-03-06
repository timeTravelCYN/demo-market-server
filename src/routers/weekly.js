const express = require('express');
const router = express.Router();
import parseRes from '../utils/parseRes';
import * as weeklyAction from '../mongo/action/weekly';
import { findAdminEmails } from '../mongo/action/users';
import dateUtil from '../utils/dateUtil';
import nunjucks from 'nunjucks';
import fs from 'fs';
import { createFile } from '../utils/file';
import 'express-zip';
import { sendNotice } from '../utils/email';

function buildMdFile (data) {
  const content = nunjucks.render('./src/config/md.tpl', {num: data.num, columns: data.columns, summary: data.summary});
  const fileName = `./md/${data.num}.md`;
  createFile(fileName, content);
}

/**
 *  查询所有已发布
 */
router.get('/findWeeklys', async (req, res, next) => {
  const data = await weeklyAction.findWeeklys();
  // 如果有错误
  if (data && data.err) {
    res.send(data.data);
    return;
  }
  
  res.send(parseRes.parseSuccess(data));
});

/**
 *  根据 id 查询
 */
router.get('/findById', async (req, res, next) => {
  const id = req.param('id');
  const data = await weeklyAction.findById(id);

  // 如果有错误
  if (data && data.err) {
    res.send(data.data);
    return;
  }
  
  // 如果未发布 且非管理员
  if (data && !data.isPublish && !req.session.userInfo && req.session.userInfo.role !== '1') {
    res.send(parseRes.WEEKLY_UN_PUBLISH);
    return;
  }

  res.send(parseRes.parseSuccess(data));
});

/**
 *  添加或保存
 */
router.post('/admin/saveOrUpdate', async (req, res, next) => {
  /**
   * 获取参数
   */
  let params;
  try {
    params = JSON.parse(req.body.data);
  } catch (e) {
    res.send(parseRes.PARAM_PARSE_ERROR);
    return;
  }

  const data = await weeklyAction.saveOrUpdate(params);
  // 如果有错误
  if (data && data.err) {
    res.send(data.data);
    return;
  }
  buildMdFile(data);
  res.send(parseRes.parseSuccess(data));
});

/**
 *  查询未发布
 */
router.get('/admin/findUnPub', async (req, res, next) => {
  const data = await weeklyAction.findUnPub();
  // 如果有错误
  if (data && data.err) {
    res.send(data.data);
    return;
  }
  
  res.send(parseRes.parseSuccess(data));
});


/**
 *  publish
 */
router.post('/admin/publish', async (req, res, next) => {
  // 周报只在周一才能操作发布
  if (new Date().getDay() !== 1) {
    res.send(parseRes.NO_WEEKLY_PUBLISH_TIME);
    return;
  }
  /**
   * 获取参数
   */
  let params;
  try {
    params = JSON.parse(req.body.data);
  } catch (e) {
    res.send(parseRes.PARAM_PARSE_ERROR);
    return;
  }
  
  const obj = {
    _id: params.id,
    isPublish: true,
    publishTime: dateUtil.format(new Date())
  };

  const data = await weeklyAction.saveOrUpdate(obj);
  // 如果有错误
  if (data && data.err) {
    res.send(data.data);
    return;
  }
  
  res.send(parseRes.parseSuccess(data));

});

/**
 *  download
 */
router.get('/admin/download', async (req, res, next) => {
  const num = req.param('num');
  res.zip([{ path: `./md/${num}.md`, name: `${num}.md` }], `${num}.zip`, (err, d) => {
    console.log('---- send zip callback -----');
    res.end();
  });
});

/**
 * send Notice
 */
router.get('/admin/sendNotice', async (req, res, next) => {
  const emails = await findAdminEmails();
  sendNotice(emails);
  res.send(parseRes.parseSuccess(emails));
});

module.exports = router;