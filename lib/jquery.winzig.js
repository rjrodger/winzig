/* Copyright (c) 2011 Richard Rodger, MIT License */


;(function( $ ){

  function enterkey(cb) {
    return function(event) {
      if( 13 == event.keyCode ) {
        cb()
      }
    }
  }


  function RestStore() {
    var self = this

    self.init = function( settings ) {
      self.settings = settings

      var base = document.location.href 
      var hi = base.indexOf('#')
      base = ~hi ? base.substring(0,hi) : base

      while( '/' == base.charAt(base.length-1) ) {
        base = base.substring(0,base.length-1)
      }
      var host = base.substring(0,base.indexOf('/',9))

      var entityurl = settings.entityurl
      if( 0 != entityurl.indexOf('http') ) {
        if( 0 != entityurl.indexOf('/') ) {
          entityurl = base+'/'+entityurl
        }
        else {
          entityurl = host+entityurl
        }
      }

      self.entityurl = entityurl
    }

    self.list = function(cb) {
      $.ajax({
        url:self.entityurl,
        dataType:'json',
        success:function(res){
          // [{text:'...'},...]
          cb && cb(res)
        },
        error:self.settings.onerror
      })
    }

    self.put = function(itemdata,cb) {
      $.ajax({
        url:self.entityurl,
        type:'PUT',
        contentType:'application/json',
        data:JSON.stringify(itemdata),
        dataType:'json',
        success:function(res){
          // {text:'...'}
          cb && cb(res)
        },
        error:self.settings.onerror
      })
    }

    self.post = function(itemname, itemdata,cb) {
      var url = self.entityurl+
        (self.settings.usequeryparam?'?name=':'/')+escape(itemname)
      $.ajax({
        url:url,
        type:'POST',
        contentType:'application/json',
        data:JSON.stringify(itemdata),
        dataType:'json',
        success:function(res){
          // {text:'...'}
          cb && cb(res)
        },
        error:self.settings.onerror
      })
    }

    self.del = function(itemname, itemdata,cb) {
      console.log('del',itemname)
      var url = self.entityurl+
        (self.settings.usequeryparam?'?name=':'/')+escape(itemname)
      $.ajax({
        url:url,
        type:'DELETE',
        dataType:'json',
        success:function(res){
          cb && cb(res)
        },
        error:self.settings.onerror
      })
    }
  }


  function BasicBuilder() {
    var self = this


    self.init = function( settings, elem ) {
      self.settings = settings
      self.elem = elem

      self.elem.item.remove()

      var add = $('<a>').text('add').click(self.add)
      var input = $('<input>').keypress(enterkey(self.add))

      if( self.settings.close ) {
        var close = $('<a>').html('&times;').click(self.close)
        self.elem.add.append(close)
      }

      self.elem.add.append(input).append(add)


      settings.store.list(function(items){
        for(var i = 0; i < items.length; i++ ) {
          self.insert(items[i])
        }
      })

    }


    self.add = function() {
      var text = self.elem.add.find('input').val()
      var item = {text:text}      

      self.settings.onadd(item, function(put) {
        if( 0 < text.length && put ) {
          self.settings.store.put({text:text},function(itemdata){
            self.insert(itemdata)
          })
        }
      })
    }


    self.close = function() {
      self.settings.onclose()
    }

    self.insert = function(itemdata){
      var itemelem = self.elem.item.clone()

      var span = $('<span>').text(itemdata.text)
      var edit = $('<a>').text('edit')
      itemelem.append(span).append(edit)
      itemelem.data('elem-text',span).data('elem-edit',edit)

      edit.bind('click.winzig',function(event){
        event.stopPropagation()
        if( !itemelem.data('state-edit') ) {
          itemelem.data('state-edit',true)
          self.edit(itemelem)
        }
      })

      itemelem.bind('click.winzig',function(event){
        var itemdata = {text:span.text()}
        self.settings.onitem(itemdata,itemelem)
      })

      self.elem.list.append(itemelem)
    }


    self.edit = function( itemelem ) {
      var text = itemelem.find('span').text()

      var input = itemelem.data('elem-input')
      var ok    = itemelem.data('elem-ok')
      var del   = itemelem.data('elem-del')

      var onok  = function(event){self.ok(text,itemelem,event)}
      var ondel = function(event){self.del(text,itemelem,event)}

      if( !input ) {
        var input = $('<input>').keypress(enterkey(onok)).click(function(event){
          event.stopPropagation()
        })
        var ok = $('<a>').text('ok').click(onok)
        var del = $('<a>').text('del').click(ondel)
        itemelem.append(input).append(ok).append(del)      
        itemelem.data('elem-input',input).data('elem-ok',ok).data('elem-del',del)
      }

      itemelem.data('elem-text').hide()
      itemelem.data('elem-edit').hide()
      input.show().val(text).focus()
      ok.show()
      del.show()
    }
    

    self.ok = function( itemname, itemelem, event ) {
      event.stopPropagation()
      var text = itemelem.data('elem-input').val()

      var itemdata = {text:text}
      self.settings.onok(itemname,itemdata, function(post) {
        if( 0 < text.length && post ) {
          itemelem.data('state-edit',false)

          itemelem.data('elem-input').hide()
          itemelem.data('elem-ok').hide()
          itemelem.data('elem-del').hide()

          itemelem.data('elem-edit').show()
          itemelem.data('elem-text').text(text).show()
          
          self.settings.store.post(itemname,itemdata,function(itemdata){
          })
        }
      })
    }

    self.del = function( itemname, itemelem, event ) {
      event.stopPropagation()
      var text = itemelem.data('elem-input').val()
      itemelem.remove()

      var itemdata = {text:text}
      self.settings.ondel(itemname, itemdata, function(del) {
        if( del ) {
          self.settings.store.del(itemname,itemdata,function(itemdata){})
        }
      })
    }
  }

  
  function injectcss() {
    var css = [
".winzig {",
"  background-color: white;",
"  border: 2px solid black;",
"  z-index:9999;",
"}",
".winzig_add {",
"  margin: 0px;",
"  padding: 4px 4px 8px 4px;",
"}",
".winzig_add a {",
"  cursor: pointer;",
"  font: 0.8em arial;",
"  color: #aaa;",
"  float: right;",
"  margin: 4px;",
"}",
".winzig_add a:hover {",
"  text-decoration: underline;",
"}",
".winzig_add input {",
"  margin: 0px;",
"  width: 80%;",
"}",
".winzig_list {",
"  list-style: none;",
"  margin: 0px;",
"  padding: 0px;",
"}",
".winzig_list li {",
"  margin: 0px;",
"  padding: 4px;",
"  border-top: 1px solid #ccc;",
"}",
".winzig_list li input {",
"  margin: 0px;",
"  width: 60%;",
"}",
".winzig_list li a {",
"  margin: 0px 0px 0px 4px;",
"  cursor: pointer;",
"  font: 0.8em arial;",
"  color: #aaa;",
"  float: right;",
"  margin: 4px;",
"}",
".winzig_list li a:hover {",
"  text-decoration: underline;",
"}",
".winzig_list li:hover {",
"  text-decoration: underline;",
"}",
""
]

    var head = document.getElementsByTagName("head")[0];         
    var style = document.createElement('style');
    style.innerHTML = css.join('\n')
    head.insertBefore(style,head.children[0])
  }


$.fn.winzig = function(options) { 
  var main = this 
  main.addClass('winzig')

  injectcss() 

  var settings = { 
    store:new RestStore(), 
    build:new BasicBuilder(), 
    entityurl:'/winzig', 
    usequeryparam:false,
    onitem:function(){},
    onadd:function(item,addfunc){addfunc(true)},
    onok:function(itemname,item,okfunc){okfunc(true)},
    ondel:function(itemname,item,delfunc){delfunc(true)},
    onclose:function(){main.slideUp()},
    onerror:function(){
      if( 'undefined' != typeof(console) ) {
        console.log.apply(console,arguments)
      }
    }
  } 

  $.extend( settings, options || {} ) 

  var elem = { 
     add:  $('<div>').addClass('winzig_add') 
    ,list: $('<ul>').addClass('winzig_list') 
    ,item: $('<li>').addClass('winzig_item') 
  } 

  main.append(elem.add).append(elem.list) 
  elem.list.append(elem.item) 

  settings.store.init(settings,elem) 
  settings.build.init(settings,elem) 

  return main 
} 

})( jQuery );