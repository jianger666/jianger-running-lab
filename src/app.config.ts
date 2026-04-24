export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/tools/index',
    'pages/profile/index',
    'pages/paceTable/index',
    'pages/painCheck/index',
    'pages/painCheck/selector/index',
    'pages/foodCalorie/index',
    'pages/profileEdit/index',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#292929',
    navigationBarTitleText: 'JR跑步助手',
    navigationBarTextStyle: 'white',
    backgroundColor: '#292929',
    backgroundColorTop: '#292929',
    backgroundColorBottom: '#292929',
  },
  tabBar: {
    color: '#999999',
    selectedColor: '#f3799e',
    backgroundColor: '#292929',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '首页',
        iconPath: 'assets/tabbar/home.png',
        selectedIconPath: 'assets/tabbar/home-active.png',
      },
      {
        pagePath: 'pages/tools/index',
        text: '工具箱',
        iconPath: 'assets/tabbar/tools.png',
        selectedIconPath: 'assets/tabbar/tools-active.png',
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
        iconPath: 'assets/tabbar/profile.png',
        selectedIconPath: 'assets/tabbar/profile-active.png',
      },
    ],
  },
});
