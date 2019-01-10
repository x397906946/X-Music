// 设置响应函数
var EventCenter = {
  on: function(type, handler){
    $(document).on(type, handler)
  },
  fire: function(type, data){
    $(document).trigger(type, data)
  }
}

//底部菜单栏功能
var Footer = {
  init: function(){
    this.$footer = $('footer')
    this.$ul = this.$footer.find('ul')
    this.$box = this.$footer.find('.box')
    this.$leftBtn = this.$footer.find('.icon-left')
    this.$rightBtn = this.$footer.find('.icon-right')
    this.isToEnd = false
    this.isToStart = true
    this.isAnimate = false

    this.bind()
    this.render()
  },

  bind: function(){
    var me = this
    var itemWidth = this.$box.find('li').outerWidth(true)
    var rowCount = Math.floor(this.$box.width()/itemWidth)
    
    // 上/下一曲按钮功能
    this.$rightBtn.on('click', function(){
      if(me.isAnimate) return
      if(!me.isToEnd){
        me.isAnimate = true
        me.$ul.animate({
          left: '-='+rowCount*itemWidth
        }, 400, function(){
          me.isAnimate = false
          me.isToStart = false
          if(parseFloat(me.$box.width()) - parseFloat(me.$ul.css('left')) >= parseFloat(me.$ul.css('width'))){
            me.isToEnd = true
          }
        })
      }
    })
    this.$leftBtn.on('click', function(){
      if(me.isAnimate) return
      if(!me.isToStart){
        me.isAnimate = true
        me.$ul.animate({
          left: '+='+rowCount*itemWidth
        }, 400, function(){
          me.isAnimate = false
          me.isToEnd = false
          if( Math.ceil(parseFloat(me.$ul.css('left'))) >= 0 ){
            me.isToStart = true
          }
        })
      }
    })

    //菜单channel被点击时传送数据给播放器
    this.$footer.on('click', 'li', function(){
      $(this).addClass('active')
             .siblings().removeClass('active')
      EventCenter.fire('select-albumn', {
        channelId: $(this).attr('data-channel-id'),
        channelName:  $(this).attr('data-channel-name')
      })
    })
  },

  render: function(){
    var me = this
    
    //获取数据
    $.getJSON('//jirenguapi.applinzi.com/fm/getChannels.php')
     .done(function(ret){
       //console.log(ret)
       me.renderFooter(ret.channels)
     }).fail(function(){
       console.log(error)
     })
  },

  //生成节点
  renderFooter: function(channels){
    var html = ''

    //设置“我的最爱”
    channels.unshift({
      channel_id: 0,
      name: '我的最爱',
      cover_small: 'http://cloud.hunger-valley.com/17-10-24/1906806.jpg-small',
      cover_middle: 'http://cloud.hunger-valley.com/17-10-24/1906806.jpg-middle',
      cover_big: 'http://cloud.hunger-valley.com/17-10-24/1906806.jpg-big',
    })

    //生成所有channel节点
    channels.forEach(function(channel){
      html += '<li data-channel-id='+channel.channel_id+' data-channel-name='+channel.name+'>'
              + ' <div class="cover" style="background-image:url('+channel.cover_small+')"></div>'
              + ' <h3>'+channel.name+'</h3>'
              +'</li>'
    })
    this.$ul.html(html)
    this.setStyle()
  },

  //设置菜单样式
  setStyle: function(){
    var count = this.$footer.find('li').length
    var width = this.$footer.find('li').outerWidth(true)
    this.$ul.css({
      width: count * width + 'px'
    })
  }
}

//播放器功能
var App = {
  init: function(){
    this.channelId = 'public_shiguang_90hou'
    this.channelName = '90后'
    this.$container = $('#page-music main')
    this.audio = new Audio()
    this.audio.autoplay = true
    this.curSong = null
    this.clock = null
    this.collections = this.loadFromLocal()

    this.bind()

    EventCenter.fire('select-albumn', {
      channelId:  '0',
      channelName:  '我的最爱'
    })
  },
  bind: function(){
    var me = this
    //读取歌曲数据
    EventCenter.on('select-albumn', function(e, channel){
      me.channelId = channel.channelId
      me.channelName = channel.channelName
      me.loadSong()
    })

    //按键功能
    this.$container.find('.btn-play').on('click', function(){
      if($(this).hasClass('icon-pause')){
        $(this).removeClass('icon-pause').addClass('icon-play')
        me.audio.pause()
      }else{
        $(this).removeClass('icon-play').addClass('icon-pause')
        me.audio.play()
      }
    })
    this.$container.find('.btn-next').on('click', function(){
      me.loadSong()
    })
    this.$container.find('.btn-collect').on('click', function(){
      var $btn = $(this)
      if($btn.hasClass('active')){
        $btn.removeClass('active')
        delete me.collections[me.curSong.sid]
      }else{
        $btn.addClass('active')
        me.collections[me.curSong.sid] = me.curSong
      }
      me.saveToLocal()
    })
    this.$container.find('.bar').on('click', function(e){
      var per = e.offsetX / parseInt(getComputedStyle(this).width)
      me.audio.currentTime = me.audio.duration * per
    })

    //歌曲状态监听
    this.audio.addEventListener('play', function(){
      clearInterval(me.clock)
      me.clock = setInterval(function(){
        me.updateState()
        me.setLyric()
      }, 1000)
      console.log('play')
    })
    this.audio.addEventListener('pause', function(){
      clearInterval(me.clock)
      console.log('pause')
    })
    this.audio.addEventListener('end', function(){
      me.loadSong()
      console.log('end')
    })
  },

  //加载歌曲
  loadSong: function(){
    var me = this
    if(this.channelId === '0'){
      me.loadCollection()
    }else{
      $.getJSON('//jirenguapi.applinzi.com/fm/getSong.php', {channel: this.channelId})
       .done(function(ret){
         me.play(ret.song[0] || null)
       })
    }
  },
  play: function(song){
    this.curSong = song
    this.audio.src = song.url
    this.$container.find('.btn-play').removeClass('icon-play').addClass('icon-pause')
    this.$container.find('.aside figure').css('background-image', 'url('+song.picture+')')
    $('.bg').css('background-image', 'url('+song.picture +')')
    this.$container.find('.detail h1').text(song.title)
    this.$container.find('.detail .author').text(song.artist)
    this.$container.find('.tag').text(this.channelName)

    if(this.collections[song.sid]){
      this.$container.find('.btn-collect').addClass('active')
    }else{
      this.$container.find('.btn-collect').removeClass('active')
    }

    this.loadLyric(song.sid)
  },
  updateState:  function(){
    var timeStr = Math.floor(this.audio.currentTime/60)+':'
                  + (Math.floor(this.audio.currentTime)%60/100).toFixed(2).substr(2)
    this.$container.find('.current-time').text(timeStr)
    this.$container.find('.bar-progress').css({
      width: this.audio.currentTime/this.audio.duration * 100 + '%'
    })
  },

  //歌词显示
  loadLyric: function(sid){
    var me = this
    $.getJSON('//jirenguapi.applinzi.com/fm/getLyric.php', {sid: sid})
     .done(function(ret){
       var lyricObj = {}
       ret.lyric.split('\n').forEach(function(line){
         var time = line.match(/\d{2}:\d{2}/g)
         if(time){
           lyricObj[time] = line.replace(/\[.+?\]/g, '')
         }
       })
       me.lyricObj = lyricObj
     })
  },
  setLyric: function(){
    var timeStr = '0'+Math.floor(this.audio.currentTime/60)+':'
                  + (Math.floor(this.audio.currentTime)%60/100).toFixed(2).substr(2)
    if(this.lyricObj && this.lyricObj[timeStr]){
      this.$container.find('.lyric p').text(this.lyricObj[timeStr]).boomText('fadeInLeft')
    }
  },

  //本地“我的最爱”歌单
  loadFromLocal: function(){
    return JSON.parse(localStorage['collections'] || '{}')
  },
  saveToLocal: function(){
    localStorage['collections'] = JSON.stringify(this.collections)
  },
  loadCollection: function(){
    var keyArray = Object.keys(this.collections)
    if(keyArray.length === 0) return
    var randomIndex = Math.floor(Math.random()*keyArray.length)
    var randomSid = keyArray[randomIndex]
    this.play(this.collections[randomSid])
  }
}

//歌词特效
$.fn.boomText = function(type){
  type = type || 'rollIn'
  this.html(function(){
    var arr = $(this).text().split('')
                     .map(function(word){
                       return '<span class="boomText">'+word+'</span>'
                     })
    return arr.join('')
  })
  var idx = 0
  var $boomText = $(this).find('span')
  var clock = setInterval(function(){
    $boomText.eq(idx).addClass('animated '+type)
    idx++
    if(idx >= $boomText.length){
      clearInterval(clock)
    }
  }, 100)
}

Footer.init()
App.init()