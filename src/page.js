/**
 * renrenmosaic 1.0 for Chrome
 * the content srcipt.
 * 把人人好友的头像拼成自己的头像
 * author meowtec
 * blog http://www.meowtec.com/
 * date 2013/10/04
 */

/**
 * ajax等通用底层函数
 */
function ajax(setting) {
    var type = setting.type,
        url = setting.url,
        data = setting.data,
        success = setting.success,
        error = setting.error,
        before = setting.before;
    var xhr = new XMLHttpRequest();
    before&&before(xhr);
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 ) {
            if ((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304) {
                success&&success(xhr);
            }else{
                error&&error(xhr);
            }
        }

    };
    var data_str = '';
    for (var i in data) {
        var attrType = typeof(data[i]);
        if (attrType == 'boolean' || attrType == 'string' || attrType == 'number') {
            data_str += (i + '=' + encodeURIComponent(data[i]) + '&');
        }
        if(Object.prototype.toString.call(data[i])=='[object Array]'){
            for(var j=0;j<data[i].length;j++){
                data_str += (i + '=' + encodeURIComponent(data[i][j]) + '&');
            }
        }

    }
    data_str = data_str.replace(/&+$/g,'');
    if(type.toUpperCase()=='GET'){
        url = url+'?'+data_str;
        data_str = null;
    }
    xhr.open(type, url, true);
    xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xhr.send(data_str);
}
function ajaxFile(setting){
    var url = setting.url,
        success = setting.success,
        error = setting.error;
    ajax({
        type:'get',
        url:url,
        before:function(xhr){
            xhr.responseType = 'blob';
        },
        success:function(xhr){
            success(xhr);
        },
        error:function(xhr){
            error(xhr);
        }
    });
}
function byId(id){
    return document.getElementById(id)
}

/*
 * 下面是主程序
 */
/*
 * 注入DOM节点
 */
var elem = document.createElement('div');
elem.className = 'create-face-from-friends';
elem.innerHTML = '<a href="javascript:;" class="intro-button" id="intro-button">生成头像</a>'+
'<div class="process" id="process"><div class="current" id="current-processor"></div><div class="img-box" id="img-box"></div><a href="javascript:void(0);" id="close" class="close">CLOSE</a></div>'+
'<div class="current-text" id="text">正在加载好友头像..18%</div>';
document.body.appendChild(elem);
/*
 * 事件
 */
var text = byId('text');
byId('intro-button').onclick = function(){
    this.style.display = 'none';
    start();
    text.style.display = 'block';
    byId('process').style.display = 'block';
    text.innerHTML = '正在获取好友列表';
}
byId('close').onclick = function(){
    document.body.removeChild(elem);
}
/*
 * 从html中得到当前用户头像，因为扩展不能访问页面变量。
 */
var docHTML = document.head.innerHTML;
var regResult = docHTML.match(/\'tinyPic\':\'(.*?)\'/);
userIcon = regResult&&regResult[1];

/*
 * friends是一个数组，存放好友头像。
 */
var friends;
/*
 * 获取好友列表
 */
function start(){
    ajax({
        url:'http://friend.renren.com/groupsdata',
        type:'get',
        success:function(xhr){
            var js = xhr.responseText;
            eval(js);
            friends = friends_manage_groups.data.friends;

            friends.currentIndex = 0;
            getImages();
        }
    });
}

/*
 * 初始化canvas
 */
var canvas = document.createElement('canvas');
canvas.setAttribute('height','5px');
canvas.setAttribute('width','5px');
var ct = canvas.getContext('2d');

/*
 * 将好友头像中的红绿蓝三色平均值提取出来，根据当前currentIndex  放到friends[currentIndex].data。
 */
function analyImage(img){
    ct.drawImage(img,0,0,5,5);
    var imagedata = ct.getImageData(0,0,5,5).data;
    var red=0,green=0,blue=0;
    for(var i=9;i<25;i++){
        red = red + imagedata[i*4];
        green = green + imagedata[i*4+1];
        blue = blue + imagedata[i*4+2];
    }
    friends[friends.currentIndex].data = [red/25,green/25,blue/25];
};

/*
 * 使用ajax获取好友头像，创建img节点。
 */
function getImages(){
    console.log(friends.currentIndex,friends.length);
    text.innerHTML = '正在加载好友头像，已加载'+parseInt(friends.currentIndex/friends.length*100)+'%';
    byId('current-processor').style.height = friends.currentIndex/friends.length*100+'%';
    ajaxFile({
        url:friends[friends.currentIndex].tiny_url,
        success:function(xhr){
            var file = xhr.response;
            var read= new FileReader();
            read.readAsDataURL(file)
            read.onload = function(){
                var img = document.createElement('img');
                img.src = this.result;
                friends[friends.currentIndex].image = img;
                img.onload = function(){
                    analyImage(this);
                    if(friends.currentIndex == friends.length-1){
                        byId('current-processor').style.height = '100%';
                        drawImage();
                    }
                    else{
                        friends.currentIndex++;
                        getImages();
                    }
                }
            }
        },
        error:function(xhr){
            friends.currentIndex++;
            getImages();
        }
    });
}

/*
 * 先得到自己的头像
 */
function drawImage(){
    ajaxFile({
        url:userIcon,
        success:function(xhr){
            var file = xhr.response;
            var read= new FileReader();
            read.readAsDataURL(file)
            read.onload = function(){
                var img = document.createElement('img');
                img.src = this.result;
                img.onload = function(){
                    /*
                     * load完成后画到画布上
                     */
                    canvas.setAttribute('width','50px');
                    canvas.setAttribute('height','50px');
                    ct.drawImage(img,0,0,50,50);
                    var data = ct.getImageData(0,0,50,50).data;
                    var imageArray = [];
                    /*
                     * 依次分析每个像素点，和好友头像中得到的红绿蓝三色进行对比，找出最接近的那个
                     */
                    for(var i=0;i<50*50;i++){
                        var red = data[i*4],
                            green = data[i*4+1],
                            blue = data[i*4+2];
                        var weight = undefined, minWeightIndex = undefined;
                        for(var j=0;j<friends.length;j++){
                            if(!friends[j].data)continue;
                            var mRed = friends[j].data[0],
                                mGreen = friends[j].data[1],
                                mBlue = friends[j].data[2];
                            var newWeight = (red - mRed)*(red - mRed) + (green - mGreen)*(green - mGreen) + (blue - mBlue)*(blue - mBlue);
                            if(weight===undefined||weight>newWeight){
                                weight = newWeight;
                                minWeightIndex = j;
                            }
                        }
                        //得到和像素最近的那个点
                        imageArray[i] = minWeightIndex;
                    }
                    //开始画图了。。
                    console.log(imageArray);
                    canvas.setAttribute('width','1000px');
                    canvas.setAttribute('height','1000px');
                    for(var i=0;i<50;i++){
                        for(var j=0;j<50;j++){
                            ct.drawImage(friends[imageArray[j+i*50]].image,j*20,i*20,20,20);
                        }
                    }
                    byId('process').style.width = '100%';
                    byId('img-box').style.opacity = 1;
                    text.style.opacity = '0';
                    text.style.visibility = 'hidden';
                    byId('img-box').innerHTML = '<img src="'+canvas.toDataURL()+'" />'
                }
            }
        }
    });
}
