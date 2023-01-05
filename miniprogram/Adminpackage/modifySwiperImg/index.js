// pages/my/admin/super/indexImgAdmin/indexImgAdmin.js
import Toast from '../../miniprogram_npm/@vant/weapp/toast/toast'
const db = wx.cloud.database();
const _ = db.command;
const app = getApp();

Page({

  /**
   * 页面的初始数据
   */
  data: {

    // 选中后的图片框颜色
    selectedColor: 'red',
    // 正常的图片框颜色
    normalColor: '#e4e4e4',
    // 首页固定可上传图片数量
    confirmNumImg: 6,
    // 修改项目
    project: [
      {
        name: '头部轮播图',
        dirName: 'swiper',
        text: '轮播图拉伸比例长宽高大约3:1，为保证显示的效果请上传的图片大致符合拉伸比例',
        empty: true,
        // 按钮编辑状态
        disabled: true,
        // 选中的图片索引
        selectIndex: 0,
        imageList: [],
        imageObject: []
      },
      
      
    ]
  },


  filterEmptyImage(sourceImg) {
    return sourceImg.filter(image => image && image.trim())
  },

  /**
   * 
   * @param {点击预览图片的索引} event 
   */
  previewImage(event) {
    let that = this;
    let project = that.data.project;
    let proIndex = event.currentTarget.dataset.index;
    let imageIndex = event.currentTarget.dataset.imageindex;
    wx.previewImage({
      urls: that.filterEmptyImage(project[proIndex].imageList),
      current: project[proIndex].imageList[imageIndex]
    })
  },

  /**
   * 取消选中的图片
   * @param {event.currentTarget.dataset.index: 当前上传的项目索引} event 
   */
  cancelSelect(event) {
    let that = this;
    let project = that.data.project;
    let proIndex = event.currentTarget.dataset.index;
    let imageObject = that.data.project[proIndex].imageObject;
    imageObject[that.data.project[proIndex].selectIndex].borderColor = this.data.normalColor;

    project[proIndex] = {
      ...project[proIndex],
      imageObject,
      disabled: true
    }
    that.setData({project})
  },

  /**
   * 长按图片进行编辑
   * @param {event.currentTarget.dataset.index: 当前上传的项目索引} event 
   */
  editImage(event) {
    let that = this;
    let proIndex = event.currentTarget.dataset.index;
    let imageIndex = event.currentTarget.dataset.imageindex;
    let selectIndex = that.data.project[proIndex].selectIndex;
    let imageObject = that.data.project[proIndex].imageObject;
    let project = that.data.project;

    //已有选中,取消已选中更新新选中
    if(!that.data.project[proIndex].disabled) {
      imageObject[selectIndex].borderColor = that.data.normalColor;
    }
    imageObject[imageIndex].borderColor = that.data.selectedColor;
    project[proIndex] = {
      ...project[proIndex],
      imageObject,
      selectIndex: imageIndex,
      disabled: false
    }
    that.setData({project})
  },

  /**
   * 删除选中的图片
   * @param {imageindex: 当前点击的图片索引;labelindex: 标签的索引} event   
   */
  deleteImage(event) {
    let that = this;
    let proIndex = event.currentTarget.dataset.index;
    let imageObject = that.data.project[proIndex].imageObject;
    let imageList = that.data.project[proIndex].imageList;
    let imageIndex = that.data.project[proIndex].selectIndex;
    let project = that.data.project;
    imageList.splice(imageIndex,1);
    imageList.push('');
    imageObject.splice(imageIndex,1);
    imageObject.push({
      url: '',
      borderColor: this.data.normalColor
    })

    project[proIndex] = {
      ...project[proIndex],
      imageObject,
      imageList,
      disabled: true
    }
    that.setData({project})
  },

  /**
   * 选择图片
   */
  chooseImage(event) {
    let that = this;
    let proIndex = event.currentTarget.dataset.index;
    let project = that.data.project;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image','video'],
      sourceType: ['album', 'camera'],
      maxDuration: 30,
      camera: 'back',
      success(res) {
        let url = res.tempFiles[0].tempFilePath;
        let imageObject = that.data.project[proIndex].imageObject;
        let imageList = that.data.project[proIndex].imageList;
        let imageIndex = that.data.project[proIndex].selectIndex;
        imageList[imageIndex] = url;
        imageObject[imageIndex].url = url;
        imageObject[imageIndex].borderColor = that.data.normalColor;

        project[proIndex] = {
          ...project[proIndex],
          imageObject,
          imageList,
          disabled: true
        }
        that.setData({project})
      }
    })
  },

  getNowTime() {
    const now = new Date();
    return (now.getMonth() + 1).toString() + now.getDate().toString() + now.getHours().toString() + now.getMinutes().toString();
  },

  /**
   * 同步上传图片至云存储，返回图片链接列表（fileID）
   */
  async uploadToCloud() {
    let that = this;
    let project = that.data.project;
    console.log('开始换取')
    wx.showLoading({
      title: '图片上传中',
    }) 
    const time = this.getNowTime();
    for (let index = 0; index < project.length; index++) {
      const pro = project[index];
      for (let index1 = 0; index1 < pro.imageList.length; index1++) {
        const imageUrl = pro.imageList[index1];
        await wx.cloud.uploadFile({
          cloudPath: 'Image/' + pro.dirName + '/' + time + '/' + index1 + '.png', // 上传至云端的路径
          filePath: imageUrl, // 临时文件路径
        }).then(res=>{
          console.log(res.fileID)
          pro.imageList[index1] = res.fileID;
          pro.imageObject[index1].url = res.fileID;
          project[index] = pro;
        }).catch(error => {
          // console.error('图片上传到云存储失败1', error)
        })
      }
      if ( index === (project.length - 1) ) {
        console.log('换取成功', project)
        wx.hideLoading()
        db.collection('indexImage').where({
          filed: 'swiper'
        })
        .update({
          data: {
            imageList: project[0].imageList
          },
          success: () => {
              Toast.success({
                message: '发布成功',
                duration: 1000
              });
          }
        })
      }
    }
  },

  onPublish() {
    let that = this;
    that.uploadToCloud();
  },

  /**
   * 空状态的上传图片，即第一次上传 
   * @param {event.currentTarget.dataset.index: 当前上传的项目索引} event 
   */
  firstUpload: function (event) {
    let proIndex = event.currentTarget.dataset.index;
    const that = this;
    let imageNum = that.data.confirmNumImg;
    let project = that.data.project;
    let imageObject = [];
    let imageList = [];
    wx.chooseMedia({
      count: imageNum,
      mediaType: ['image','video'],
      sourceType: ['album', 'camera'],
      maxDuration: 30,
      camera: 'back',
      success(res) {
        for(let i = 0; i < imageNum; i++) {
          let url = '';
          if(i < res.tempFiles.length) {// 上传的图片直接赋值url显示
            url = res.tempFiles[i].tempFilePath;
            imageObject.push({
              url: url,
              borderColor: that.data.normalColor
            })
            imageList.push(url);
          } else {// 不足数量的部分显示空图片
            url = '';
            imageObject.push({
              url: url,
              borderColor: that.data.normalColor
            })
            imageList.push(url);
          }
          console.log(url)
        }
        project[proIndex] = {
            ...project[proIndex],
            imageObject,
            imageList,
            empty: false
        }
        that.setData({project})
      },
      fail: console.error
    })
  },

  /**
   * 全部清空上传的图片
   * @param {index: 项目的索引} event 
   */
  allClear(event) {
    let proIndex = event.currentTarget.dataset.index;
    let project = this.data.project;
    project[proIndex].imageList = [];
    project[proIndex].imageObject = [];
    project[proIndex].empty = true;
    this.setData({
      project
    })
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    let that = this;
    let project = that.data.project;
    db.collection('indexImage').where({
      filed: 'swiper'
    }).get().then(res=>{
      let resImageList = res.data[0].imageList;
      if(resImageList.length == 0) {
        that.setData({
          'project[0].empty': true
        })
      } else {
        let imageObject = [];
        resImageList.forEach( url => {
          imageObject.push({
            url: url,
            borderColor: that.data.normalColor
          })
        })
        project[0] = {
            ...project[0],
            imageObject,
            imageList: resImageList,
            empty: false
        }
        that.setData({project})
      }
    })
    


    
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {

  }
})