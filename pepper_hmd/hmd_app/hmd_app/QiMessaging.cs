﻿using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using SocketIOClient;

#region 元ソース

#if false

function QiSession(host, resource)
{
  /*! https://github.com/warpdesign/deferred-js / Copyright 2012 (C) Nicolas Ramz MIT Licensed */
  var Deferred = function(){function isArray(arr){return"[object Array]"===Object.prototype.toString.call(arr)}function foreach(arr,handler){if(isArray(arr))for(var i=0;i<arr.length;i++)handler(arr[i]);else handler(arr)}function D(fn){var status="pending",doneFuncs=[],failFuncs=[],progressFuncs=[],resultArgs=null,promise={done:function(){for(var i=0;i<arguments.length;i++)if(arguments[i])if(isArray(arguments[i]))for(var arr=arguments[i],j=0;j<arr.length;j++)"resolved"===status&&arr[j].apply(this,resultArgs),doneFuncs.push(arr[j]);else"resolved"===status&&arguments[i].apply(this,resultArgs),doneFuncs.push(arguments[i]);return this},fail:function(){for(var i=0;i<arguments.length;i++)if(arguments[i])if(isArray(arguments[i]))for(var arr=arguments[i],j=0;j<arr.length;j++)"rejected"===status&&arr[j].apply(this,resultArgs),failFuncs.push(arr[j]);else"rejected"===status&&arguments[i].apply(this,resultArgs),failFuncs.push(arguments[i]);return this},always:function(){return this.done.apply(this,arguments).fail.apply(this,arguments)},progress:function(){for(var i=0;i<arguments.length;i++)if(arguments[i])if(isArray(arguments[i]))for(var arr=arguments[i],j=0;j<arr.length;j++)"pending"===status&&progressFuncs.push(arr[j]);else"pending"===status&&progressFuncs.push(arguments[i]);return this},_then:function(){arguments.length>1&&arguments[1]&&this.fail(arguments[1]),arguments.length>0&&arguments[0]&&this.done(arguments[0]),arguments.length>2&&arguments[2]&&this.progress(arguments[2])},promise:function(obj){if(null==obj)return promise;for(var i in promise)obj[i]=promise[i];return obj},state:function(){return status},debug:function(){console.log("[debug]",doneFuncs,failFuncs,status)},isRejected:function(){return"rejected"===status},isResolved:function(){return"resolved"===status},then:function(done,fail){return D(function(def){foreach(done,function(func){"function"==typeof func?deferred.done(function(){var returnval=func.apply(this,arguments);returnval&&"function"==typeof returnval?returnval.promise()._then(def.resolve,def.reject,def.notify):def.resolve(returnval)}):deferred.done(def.resolve)}),foreach(fail,function(func){"function"==typeof func?deferred.fail(function(){var returnval=func.apply(this,arguments);returnval&&"function"==typeof returnval?returnval.promise()._then(def.resolve,def.reject,def.notify):def.reject(returnval)}):deferred.fail(def.reject)})}).promise()}},deferred={resolveWith:function(context){if("pending"===status){status="resolved";for(var args=resultArgs=arguments.length>1?arguments[1]:[],i=0;i<doneFuncs.length;i++)doneFuncs[i].apply(context,args)}return this},pipe:function(){return then(arguments)},rejectWith:function(context){if("pending"===status){status="rejected";for(var args=resultArgs=arguments.length>1?arguments[1]:[],i=0;i<failFuncs.length;i++)failFuncs[i].apply(context,args)}return this},notifyWith:function(context){if("pending"===status)for(var args=resultArgs=arguments.length>1?arguments[1]:[],i=0;i<progressFuncs.length;i++)progressFuncs[i].apply(context,args);return this},resolve:function(){return this.resolveWith(this,arguments)},reject:function(){return this.rejectWith(this,arguments)},notify:function(){return this.notifyWith(this,arguments)}},obj=promise.promise(deferred);return fn&&fn.apply(obj,[obj]),obj}D.when=function(){if(arguments.length<2){var obj=arguments.length?arguments[0]:void 0;return obj&&"function"==typeof obj.isResolved&&"function"==typeof obj.isRejected?obj.promise():D().resolve(obj).promise()}return function(args){for(var df=D(),size=args.length,done=0,rp=new Array(size),i=0;i<args.length;i++)!function(j){var obj=null;args[j].done?args[j].done(function(){rp[j]=arguments.length<2?arguments[0]:arguments,++done==size&&df.resolve.apply(df,rp)}).fail(function(){df.reject(arguments)}):(obj=args[j],args[j]=new Deferred,args[j].done(function(){rp[j]=arguments.length<2?arguments[0]:arguments,++done==size&&df.resolve.apply(df,rp)}).fail(function(){df.reject(arguments)}).resolve(obj))}(i);return df.promise()}(arguments)};return D}();

  if (host == undefined)
    host = window.location.host;
  if (resource == undefined)
    resource = "libs/qimessaging/1.0/socket.io";
  if (host.substring(0, 7) != "http://")
    host = "http://" + host;

  var _socket = io.connect(host, { resource: resource });
  var _dfd = new Array();
  var _sigs = new Array();
  var _idm = 0;

  _socket.on('reply', function (data) {
    var idm = data["idm"];

    if (data["result"] != null && data["result"]["metaobject"] != undefined)
    {
      var o = new Object();
      o.__MetaObject = data["result"]["metaobject"];
      var pyobj = data["result"]["pyobject"];
      _sigs[pyobj] = new Array();

      var methods = o.__MetaObject["methods"];
      for (var i in methods)
      {
        var methodName = methods[i]["name"];
        o[methodName] = createMetaCall(pyobj, methodName);
      }

      var signals = o.__MetaObject["signals"];
      for (var i in signals)
      {
        var signalName = signals[i]["name"];
        o[signalName] = createMetaSignal(pyobj, signalName);
      }

      _dfd[idm].resolve(o);
    }
    else
    {
      if (_dfd[idm].__cbi != undefined)
      {
        var cbi = _dfd[idm].__cbi;
        _sigs[cbi["obj"]][cbi["signal"]][data["result"]] = cbi["cb"];
      }
      _dfd[idm].resolve(data["result"]);
    }
    delete _dfd[idm];
  });

  _socket.on('error', function (data) {
    if (data["idm"] != undefined)
    {
      _dfd[data["idm"]].reject(data["result"]);
      delete _dfd[data["idm"]];
    }
  });

  _socket.on('signal', function (data) {
    var res = data["result"];
    var callback = _sigs[res["obj"]][res["signal"]][res["link"]];
    if (callback != undefined)
    {
      callback.apply(this, res["data"]);
    }
  });

  _socket.on('disconnect', function(data) {
    for (var idm in _dfd)
    {
      _dfd[idm].reject("Call " + idm + " canceled: disconnected");
      delete _dfd[idm];
    }
  });

  function createMetaCall(obj, method, data)
  {
    return function() {
      var idm = ++_idm;
      var args = Array.prototype.slice.call(arguments, 0);
      _dfd[idm] = new Deferred();
      if (method == "registerEvent")
      {
        _dfd[idm].__cbi = data;
      }
      _socket.emit('call', { idm: idm, params: { obj: obj, method: method, args: args } });

      return _dfd[idm].promise();
    }
  }

  function createMetaSignal(obj, signal)
  {
    var s = new Object();
    _sigs[obj][signal] = new Array();
    s.connect = function(cb) {
      return createMetaCall(obj, "registerEvent", { obj: obj, signal: signal, cb: cb })(signal);
    }
    s.disconnect = function(l) {
      delete _sigs[obj][signal][l];
      return createMetaCall(obj, "unregisterEvent")(signal, l);
    }
    return s;
  }

  this.service = createMetaCall("ServiceDirectory", "service");

  this.socket = function()
  {
    return _socket;
  }
}
#endif

#endregion

namespace qiMessaging
{
    /// <summary>
    /// javascriptのQiMessagingをC#で実装してみた最小限のクラス
    /// ライセンスなどは元のソースに準拠で。(TODO: 本気で公開されるならちゃんと整える)
    /// </summary>
    /// <remarks>
    /// 本家にもC#版がありましたが、DLLラップしただけだったので
    /// 多分UnityFreeで動かない予感がするので自力で実装。
    /// </remarks>
    public class QiMessaging
    {
        public event Action<QiMessaging> Connected;
        public event Action<QiMessaging> Disconnected;
        public event Action<QiMessaging> Error;

        public QiMessaging()
        {
            Service = createMetaCall_("ServiceDirectory", "service", null);
        }

        public void Connect(string url)
        {
            client_ = new Client(url);

            client_.On("connect", (message) =>
            {
                System.Diagnostics.Debug.WriteLine("Connect");
                Connected(this);
            });
            client_.On("disconnect", (message) =>
            {
                System.Diagnostics.Debug.WriteLine("disconnect");
                Disconnected(this);
            });
            client_.On("error", (message) =>
            {
                System.Diagnostics.Debug.WriteLine("error");
                Error(this);
            });
            client_.On("message", (message) =>
            {
                System.Diagnostics.Debug.WriteLine("Msg");
            });
            client_.On("reply", (json) =>
            {
                System.Diagnostics.Debug.WriteLine("reply");

                var data = new JsonData(json.Json.args[0]);

                var idm = data["idm"].Cast<long>();
                if (data["result"] != null && data["result"]["metaobject"] != null)
                {
                    var o = new QiInstance();

                    o["__MetaObject"] = data["result"]["metaobject"];
                    var pyobj = data["result"]["pyobject"].Cast<long>();
                    sigTbl_[pyobj] = new Dictionary<string, Dictionary<string, object>>();

                    var methods = o["__MetaObject"]["methods"].JsonList;
                    foreach (var method in methods)
                    {
                        var methodName = method["name"].As<string>();
                        o.methods[methodName] = createMetaCall_(pyobj, methodName, null);
                        o[methodName] = new JsonData(o.methods[methodName]);
                    }

                    var signals = o["__MetaObject"]["signals"].JsonList;
                    foreach (var signal in signals)
                    {
                        var signalName = signal["name"].As<string>();
                        o.signals[signalName] = createMetaSignal_(pyobj, signalName);
                        o[signalName] = new JsonData(o.signals[signalName]);
                    }

                    dfdTbl_[idm].Resolve(o);
                }
                else
                {
                    if (dfdTbl_[idm].cbi != null)
                    {
                        var cbi = dfdTbl_[idm].cbi;
                        sigTbl_[cbi.obj][cbi.signal][data["result"].As<string>()] = cbi.cb;
                    }
                    dfdTbl_[idm].Resolve(data["result"]);
                }
            });
            client_.On("signal", (message) =>
            {
                System.Diagnostics.Debug.WriteLine("signal");
            });

            System.Diagnostics.Debug.WriteLine(client_.LastErrorMessage);
        }

        public readonly FuncArgv<Deferred, object> Service;

        #region 実装です

        private SocketIOClient.Client client_;

        protected class Cbi
        {
            public long obj;
            public string signal;
            public string cb;
        }
        protected class DeferredWithCbi : Deferred
        {
            public Cbi cbi;
        }

        int idm_ = 0;
        Dictionary<long, DeferredWithCbi> dfdTbl_ = new Dictionary<long, DeferredWithCbi>();
        Dictionary<long, Dictionary<string, Dictionary<string, object>>> sigTbl_ = new Dictionary<long, Dictionary<string, Dictionary<string, object>>>();

        protected FuncArgv<Deferred, object> createMetaCall_(object obj, string method, Cbi cbi)
        {
            return (argments) =>
            {
                var idm = ++idm_;
                dfdTbl_[idm] = new DeferredWithCbi();

                if (argments[0] as string == "registerEvent")
                {
                    dfdTbl_[idm].cbi = cbi;
                }
                //{ idm: idm, params: { obj: obj, method: method, args: args } }
                var jsonData = new JsonData();

                jsonData["idm"] = new JsonData(idm);
                jsonData["params"] = new JsonData();
                {
                    jsonData["params"]["obj"] = new JsonData(obj);
                    jsonData["params"]["method"] = new JsonData(method);
                    jsonData["params"]["args"] = new JsonData(argments);
                }
                client_.Emit("call", jsonData.JsonDataRaw);

                return dfdTbl_[idm];
            };
        }
        protected QiSignal createMetaSignal_(long obj, string signal)
        {
            var s = new QiSignal();

            sigTbl_[obj][signal] = new Dictionary<string, object>();

            s.Connect = (args) =>
            {
                var cb = (string)args[0];
                var cbi = new Cbi();
                cbi.obj = obj;
                cbi.signal = signal;
                cbi.cb = cb;
                return createMetaCall_(obj, "registerEvent", cbi)(signal);
            };
            s.Disconnect = (args) =>
            {
                var l = (string)args[0];
                sigTbl_[obj][signal][l] = null;
                return createMetaCall_(obj, "unregisterEvent", null)(signal, l);
            };
            return s;
        }
        #endregion
    }

    public class QiSignal
    {
        public FuncArgv<Deferred, object> Connect;
        public FuncArgv<Deferred, object> Disconnect;
    };

    public class QiInstance : JsonData
    {
        public Dictionary<string, FuncArgv<Deferred, object>> methods = new Dictionary<string, FuncArgv<Deferred, object>>();
        public Dictionary<string, QiSignal> signals = new Dictionary<string, QiSignal>();
    }

    public delegate R FuncArgv<R, A>(params A[] args);

    /// <summary>
    /// 最低限のDeferred
    /// </summary>
    /// <remarks>
    /// 大規模なのか古いのしか無かったので車輪の再発明…
    /// </remarks>
    public class Deferred
    {
        enum State
        {
            Pending,
            Resolve,
            Reject,
        };
        object arg_;
        State state_ = State.Pending;
        Func<object, Deferred> done_;
        Func<object, Deferred> fail_;

        public Deferred Resolve()
        {
            state_ = State.Resolve;
            if (done_ != null)
            {
                done_(arg_);
            }
            return this;
        }
        public Deferred Resolve(object arg)
        {
            state_ = State.Resolve;
            arg_ = arg;
            if (done_ != null)
            {
                done_(arg_);
            }
            return this;
        }
        public Deferred Reject()
        {
            if (fail_ != null)
            {
                fail_(arg_);
            }
            return this;
        }
        public Deferred Reject(object arg)
        {
            state_ = State.Resolve;
            arg_ = arg;
            if (fail_ != null)
            {
                fail_(arg_);
            }
            return this;
        }
        public Deferred Then(Func<object, Deferred> done, Func<object, Deferred> fail)
        {
            if (state_ == State.Pending)
            {
                done_ = done;
                fail_ = fail;
            }
            else if (state_ == State.Resolve)
            {
                return done(arg_);
            }
            else if (state_ == State.Reject)
            {
                return fail(arg_);
            }
            return this;
        }
        public Deferred Then(Action done, Action fail)
        {
            var self = this;
            if (state_ == State.Pending)
            {
                done_ = (arg) => { done(); return self; };
                fail_ = (arg) => { fail(); return self; };
            }
            else if (state_ == State.Resolve)
            {
                done();
            }
            else if (state_ == State.Reject)
            {
                fail();
            }
            return self;
        }
        public Deferred Then(Action<object> done, Action fail)
        {
            var self = this;
            if (state_ == State.Pending)
            {
                done_ = (arg) => { done(arg); return self; };
                fail_ = (arg) => { fail(); return self; };
            }
            else if (state_ == State.Resolve)
            {
                done(arg_);
            }
            else if (state_ == State.Reject)
            {
                fail();
            }
            return self;
        }

        public Deferred Then(Func<object, Deferred> done)
        {
            return Then(done, (Func<object, Deferred>)null);
        }
        public Deferred Then(Action done)
        {
            return Then(done, (Action)null);
        }
        public Deferred Then(Action<object> done)
        {
            return Then(done, (Action)null);
        }
    }

    /// <summary>
    /// SimpleJsonなオブジェクトの超簡易なアクセス補助
    /// </summary>
    /// <remarks>
    /// 似たようなの沢山ありそうだけど、小規模なの探すの大変だったので車輪の再発明。
    /// </remarks>
    public class JsonData
    {
        /// <summary>
        /// 空のJsonDataはテーブル
        /// </summary>
        public JsonData()
        {
            jsonData = new Dictionary<string, object>();
        }
        /// <summary>
        /// データ入りJsonDataはデータそのもの
        /// </summary>
        public JsonData(object data)
        {
            jsonData = data;
        }
        public JsonData this[string name]
        {
            get
            {
                var table = JsonDataRaw as IDictionary<string, object>;
                if (table == null) return null;
                return new JsonData(table[name]);
            }
            set
            {
                var table = JsonDataRaw as IDictionary<string, object>;
                if (table == null)
                {
                    throw new Exception("jsondata is not table");
                }
                table[name] = value.JsonDataRaw;
            }
        }
        public void Set<T>(T data)
        {
            jsonData = data;
        }
        public bool ContainsKey(string name)
        {
            var table = JsonDataRaw as IDictionary<string, object>;
            if (table == null) return false;
            return table.ContainsKey(name);
        }

        /// <summary>
        /// 列挙可能な型のJsonDataRawの場合に中身をJsonTableにして詰めたリストを返します
        /// テーブルのJsonDataRawの場合はValueをJsonTableにして詰めたリストを返します
        /// </summary>
        public List<JsonData> JsonList
        {
            get
            {
                var list = new List<JsonData>();
                if (JsonDataRaw is IEnumerable<object>)
                {
                    foreach (var obj in (JsonDataRaw as IEnumerable<object>))
                    {
                        list.Add(new JsonData(obj));
                    }
                }
                else if (JsonDataRaw is IDictionary<string, object>)
                {
                    foreach (var obj in (JsonDataRaw as IDictionary<string, object>))
                    {
                        list.Add(new JsonData(obj.Value));
                    }
                }
                return list;
            }
        }

        public bool IsNull()
        {
            return JsonDataRaw != null;
        }
        public T As<T>() where T : class
        {
            return JsonDataRaw as T;
        }
        public T Cast<T>()
        {
            return (T)JsonDataRaw;
        }

        public object JsonDataRaw
        {
            get
            {
                object trueJsonData = jsonData;
                if (trueJsonData is JsonData)
                {
                    trueJsonData = (trueJsonData as JsonData).JsonDataRaw;
                }
                return trueJsonData;
            }
        }
        protected object jsonData;
    }

    public class Lazy<T>
    {
        private readonly Func<T> func;
        private bool hasValue;
        private T value;

        public Lazy(Func<T> func)
        {
            this.func = func;
            this.hasValue = false;
        }

        public static implicit operator Lazy<T>(Func<T> func)
        {
            return new Lazy<T>(func);
        }

        public static implicit operator T(Lazy<T> lazy)
        {
            if (!lazy.hasValue)
            {
                lazy.value = lazy.func();
                lazy.hasValue = true;
            }
            return lazy.value;
        }
    }
}
