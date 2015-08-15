using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Text;

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
            ServiceRaw = createMetaCall_<QiServiceJsonData, JsonData>("ServiceDirectory", "service", null);
        }

        public bool IsConnected
        {
            get{
                return client_ != null && client_.IsConnected;
            }
        }

        #region Connect, Disconnect
        public void Connect(string url)
        {
            if(IsConnected)
            {
                return;
            }
            client_ = new Client(url);

            client_.On("connect", (message) =>
            {
                System.Diagnostics.Debug.WriteLine("Connect");
                if (Connected != null) Connected(this);
            });
            client_.On("disconnect", (message) =>
            {
                System.Diagnostics.Debug.WriteLine("disconnect");
                if (Disconnected != null) Disconnected(this);
            });
            client_.On("error", (json) =>
            {
                var data = new JsonData(json.Json.args[0]);
                if (data["idm"] != null)
                {
                    var idm = data["idm"].Cast<long>();
                    if (dfdTbl_[idm].dfd is Deferred<QiServiceJsonData, JsonData>)
                    {
                        (dfdTbl_[idm].dfd as Deferred<QiServiceJsonData, JsonData>).Reject(data["result"]);
                    }
                    else
                    {
                        (dfdTbl_[idm].dfd as Deferred<JsonData, JsonData>).Reject(data["result"]);
                    }
                    dfdTbl_.Remove(idm);
                }

                System.Diagnostics.Debug.WriteLine("error");
                if (Error != null) Error(this);
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
                    var o = new QiServiceJsonData();

                    o["__MetaObject"] = data["result"]["metaobject"];
                    var pyobj = data["result"]["pyobject"].Cast<long>();
                    sigTbl_[pyobj] = new Dictionary<string, Dictionary<string, object>>();

                    var methods = o["__MetaObject"]["methods"].JsonList;
                    foreach (var method in methods)
                    {
                        var methodName = method["name"].As<string>();
                        o.methods[methodName] = createMetaCall_<JsonData,JsonData>(pyobj, methodName, null);
                        o[methodName] = new JsonData(o.methods[methodName]);
                    }

                    var signals = o["__MetaObject"]["signals"].JsonList;
                    foreach (var signal in signals)
                    {
                        var signalName = signal["name"].As<string>();
                        o.signals[signalName] = createMetaSignal_(pyobj, signalName);
                        o[signalName] = new JsonData(o.signals[signalName]);
                    }

                    (dfdTbl_[idm].dfd as Deferred<QiServiceJsonData,JsonData>).Resolve(o);
                }
                else
                {
                    if (dfdTbl_[idm].cbi != null)
                    {
                        var cbi = dfdTbl_[idm].cbi;
                        sigTbl_[cbi.obj][cbi.signal][data["result"].As<string>()] = cbi.cb;
                    }
                    (dfdTbl_[idm].dfd as Deferred<JsonData,JsonData>).Resolve(data["result"]);
                }
                dfdTbl_.Remove(idm);
            });
            client_.On("signal", (message) =>
            {
                System.Diagnostics.Debug.Assert(false, "未実装なう");

                System.Diagnostics.Debug.WriteLine("signal");
            });

            client_.Connect();

            System.Diagnostics.Debug.WriteLine(client_.LastErrorMessage);
        }
        public void Disconnect()
        {
            client_.Close();
            client_ = null;
        }
        #endregion

        #region Service

        Dictionary<string,Deferred<QiServiceJsonData, JsonData>> serviceCacheTbl_  = new Dictionary<string,Deferred<QiServiceJsonData,JsonData>>();
        
        /// <summary>
        /// サービス。AL○○系を取得する為のものです。
        /// </summary>
        /// <param name="name">サービス名</param>
        /// <returns></returns>
        /// <remarks>
        /// この関数は2度目の取得の際に、キャッシュから返します。
        /// 通信量が膨大(1回につき10万文字とか帰ってきた)なのでその為の対策です。
        /// </remarks>
        public Deferred<QiServiceJsonData, JsonData> Service(string name)
        {
            if(serviceCacheTbl_.ContainsKey(name)){
                return serviceCacheTbl_[name];
            }
            serviceCacheTbl_[name] = ServiceRaw(name);
            return serviceCacheTbl_[name];
        }
        
        /// <summary>
        /// キャッシュ無しのService。
        /// </summary>
        /// <remarks>
        /// 通信量が膨大なので使う必要はありません。
        /// 
        /// </remarks>
        public readonly FuncArgv<Deferred<QiServiceJsonData, JsonData>, object> ServiceRaw;
        
        #endregion

        #region 実装です

        private SocketIOClient.Client client_;

        protected class Cbi
        {
            public long obj;
            public string signal;
            public string cb;
        }
        //protected class DeferredWithCbi : DeferredWithCbi<JsonData, JsonData>
        //{
        //}
        protected class DeferredWithCbi<A,B> : Deferred<A, B>
        {
            public Cbi cbi;
        }
        protected class DfdInfo
        {
            public object dfd;
            public Cbi cbi;
        }
        

        int idm_ = 0;
        Dictionary<long, DfdInfo> dfdTbl_ = new Dictionary<long, DfdInfo>();
        Dictionary<long, Dictionary<string, Dictionary<string, object>>> sigTbl_ = new Dictionary<long, Dictionary<string, Dictionary<string, object>>>();

        protected FuncArgv<Deferred<DoneArgT, FailArgT>, object> createMetaCall_<DoneArgT, FailArgT>(object obj, string method, Cbi cbi)
        {
            return (argments) =>
            {
                var idm = ++idm_;
                dfdTbl_[idm] = new DfdInfo();
                dfdTbl_[idm].dfd = new Deferred<DoneArgT, FailArgT>();

                if (method == "registerEvent")
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

                return dfdTbl_[idm].dfd as Deferred<DoneArgT, FailArgT>;
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
                return createMetaCall_<JsonData,JsonData>(obj, "registerEvent", cbi)(signal);
            };
            s.Disconnect = (args) =>
            {
                var l = (string)args[0];
                sigTbl_[obj][signal][l] = null;
                return createMetaCall_<JsonData, JsonData>(obj, "unregisterEvent", null)(signal, l);
            };
            return s;
        }
        #endregion
    }

    public class QiSignal
    {
        public FuncArgv<Deferred<JsonData, JsonData>, object> Connect;
        public FuncArgv<Deferred<JsonData, JsonData>, object> Disconnect;
    };

    public class QiServiceJsonData : JsonData
    {
        public Dictionary<string, FuncArgv<Deferred<JsonData, JsonData>, object>> methods = new Dictionary<string, FuncArgv<Deferred<JsonData, JsonData>, object>>();
        public Dictionary<string, QiSignal> signals = new Dictionary<string, QiSignal>();
    }

    public delegate R FuncArgv<R, A>(params A[] args);

    /// <summary>
    /// Deferredのバリエーション。Resolve、Rejectの引数型指定無しのタイプ
    /// </summary>
    public class Deferred : Deferred<object> {}

    /// <summary>
    /// Deferredのバリエーション。Resolve関数の引数型指定のあるタイプ
    /// </summary>
    /// <typeparam name="ResolveArgT"></typeparam>
    public class Deferred<ResolveArgT> : Deferred<ResolveArgT, object> { }

    /// <summary>
    /// 最低限のDeferred
    /// </summary>
    /// <typeparam name="DoneArgT">Resolveの引数型</typeparam>
    /// <typeparam name="FailArgT">Rejectの引数型</typeparam>
    /// <remarks>
    /// 大規模なのか古いのしか無かったので車輪の再発明…
    /// ソース単品で動いてジェネリックでいい感じのあったら置き換えるかも…
    /// </remarks>
    public class Deferred<DoneArgT, FailArgT>
    {
        enum State
        {
            Pending,
            Resolve,
            Reject,
        };
        object arg_;
        State state_ = State.Pending;
        Action<DoneArgT> done_;
        Action<FailArgT> fail_;

        /// <summary>
        /// Resolve 引数×
        /// </summary>
        /// <returns>自分をそのまま返します</returns>
        public Deferred<DoneArgT,FailArgT> Resolve()
        {
            state_ = State.Resolve;
            if (done_ != null)
            {
                done_((DoneArgT)arg_);
            }
            return this;
        }
        /// <summary>
        /// Resolve 引数○
        /// </summary>
        /// <returns>自分をそのまま返します</returns>
        public Deferred<DoneArgT, FailArgT> Resolve(DoneArgT arg)
        {
            state_ = State.Resolve;
            arg_ = arg;
            if (done_ != null)
            {
                done_((DoneArgT)arg_);
            }
            return this;
        }
        /// <summary>
        /// Reject 引数×
        /// </summary>
        /// <returns>自分をそのまま返します</returns>
        public Deferred<DoneArgT, FailArgT> Reject()
        {
            state_ = State.Reject;
            if (fail_ != null)
            {
                fail_((FailArgT)arg_);
            }
            return this;
        }
        /// <summary>
        /// Reject 引数○
        /// </summary>
        /// <returns>自分をそのまま返します</returns>
        public Deferred<DoneArgT, FailArgT> Reject(FailArgT arg)
        {
            state_ = State.Reject;
            arg_ = arg;
            if (fail_ != null)
            {
                fail_((FailArgT)arg_);
            }
            return this;
        }

        #region ThenとFail

        /// <summary>
        /// Then Done引数○ 戻り値○ Fail引数○ 戻り値○
        /// </summary>
        /// <typeparam name="NextDoneArgT">戻り値のDfdのDoneの引数型</typeparam>
        /// <typeparam name="NextFailArgT">戻り値のDfdのFailの引数型</typeparam>
        /// <param name="done">Deffered{NextDoneArgT, NextDoneArgT} Func(DoneArgT arg)という形の成功時のコールバック</param>
        /// <param name="fail">Deffered{NextDoneArgT, NextDoneArgT} Func(FailArgT arg)という形の失敗時のコールバック</param>
        /// <returns> Deffered{NextDoneArgT, NextDoneArgT} </returns>
        /// <remarks>
        /// C#に落とし込んだThenのコールバックとその戻り値のルールはそこそこ厳格になっています。
        /// 引数有りコールバックの引数型は、Deferredに型指定がある場合型チェックがかかります(無い場合objectになのでチェック無しです)
        /// 引数無しコールバックも可能です(Resolve,Rejectの引数は無視されます)
        /// 戻り値有りのコールバックの戻り値は、Deffered型またはその派生型限定です(Cast出来ればOK)
        /// 戻り値有りのコールバックの戻り値から、Then関数の戻り値のDeffered型が推論されて決定されるのでDoneとFailの戻り値型は合わせる必要があります
        /// Failのコールバックを省略した場合は、Deferred型のFailArgTの型が、戻り値のDeferredにも使われます。
        /// この制約は、コールバックを省略した場合、渡される予定の引数が次のThenに引き渡される仕様によるものです。(再現したらこうなりました)
        /// 空のコールバック等でもいいので指定すれば、引き渡されないので、Doneのコールバックの戻り値型が使われます。
        /// なお、これらの制約は明示的な型指定した場合のみなので、object型を指定すれば javascript の様にユルい感じになります。
        /// (変換不要でインテリセンスもそのままかかるのでC#なら型指定した方が便利ですけども(C#だとキャストかリフレクション使わないと何もアクセスできないですし))
        /// 
        /// なお、適切な引数を使えば基本的に型推論されるのでThen関数の型パラメタの指定は不要(なはず)です。
        /// 必要になっていたら使い方間違いの可能性ありです。
        /// 
        /// 注意点。http://stackoverflow.com/questions/29706054/wrong-overload-giving-compiler-error こちらで議論されてるような制約（バグ？仕様？）により、
        /// ★Then(()=>{return new Deferred{A,B}} OK
        /// ★Deferred{A,B} somefunc(){return return new Deferred{A,B};} 
        /// 　Then(somefunc) error CS0121
        /// になります。
        /// 渡すモノを明示的にキャストすれば回避できるみたいですが、不便きわまるので、
        /// ThenAとThenFを別途用意してるのでラムダ式やデリゲートでなく、関数を渡したいときは、こちらを使ってください。
        /// </remarks>
        public Deferred<NextDoneArgT, NextFailArgT> Then<NextDoneArgT, NextFailArgT>(
            Func<DoneArgT, Deferred<NextDoneArgT, NextFailArgT>> done, 
            Func<FailArgT, Deferred<NextDoneArgT, NextFailArgT>> fail
            )
        {
            if (state_ == State.Resolve)
            {
                //結果が決まってる
                return done((DoneArgT)arg_);
            }
            else if (state_ == State.Reject)
            {
                //結果が決まってる
                return fail((FailArgT)arg_);
            }
            if (state_ == State.Pending)
            {
            }
            //遅延させる
            //非同期実行の為に自分のResolveやRejectが呼ばれたときの次の処理を登録する為のdfdを作ります
            var callbackDfd = new Deferred<NextDoneArgT, NextFailArgT>();
            done_ = (arg) =>
            {
                done(arg).Then((arg2) => { callbackDfd.Resolve(arg2); },
                               (arg2) => { callbackDfd.Reject(arg2); });
            };
            fail_ = (arg) =>
            {
                fail(arg).Then((arg2) => { callbackDfd.Resolve(arg2); },
                               (arg2) => { callbackDfd.Reject(arg2); });
            };
            return callbackDfd;
        }
        public Deferred<NextDoneArgT, NextFailArgT> ThenF<NextDoneArgT, NextFailArgT>(Func<DoneArgT, Deferred<NextDoneArgT, NextFailArgT>> done, Func<FailArgT, Deferred<NextDoneArgT, NextFailArgT>> fail) { return Then(done, fail); }
        /// <summary>
        /// Then Done引数○ 戻り値× Fail引数○ 戻り値×
        /// </summary>
        public Deferred<object, object> Then(Action<DoneArgT> done_noRet, Action<FailArgT> fail_noRet)
        {
            var done = make_done_noRet_<object, object>(done_noRet);
            var fail = make_fail_noRet_<object, object>(fail_noRet);
            return Then(done, fail);
        }
        public Deferred<object, object> ThenA(Action<DoneArgT> done_noRet, Action<FailArgT> fail_noRet) { return Then(done_noRet, fail_noRet); }
        /// <summary>
        /// Then Done引数○ 戻り値○ Fail引数○ 戻り値○
        /// </summary>
        public Deferred<NextDoneArgT, NextFailArgT> Then<NextDoneArgT, NextFailArgT>(Func<Deferred<NextDoneArgT, NextFailArgT>> done_noArg, Func<Deferred<NextDoneArgT, NextFailArgT>> fail_noArg)
        {
            var done = make_done_noArg_<NextDoneArgT, NextFailArgT>(done_noArg);
            var fail = make_fail_noArg_<NextDoneArgT, NextFailArgT>(fail_noArg);
            return Then(done, fail);
        }
        public Deferred<NextDoneArgT, NextFailArgT> ThenF<NextDoneArgT, NextFailArgT>(Func<Deferred<NextDoneArgT, NextFailArgT>> done_noArg, Func<Deferred<NextDoneArgT, NextFailArgT>> fail_noArg) { return Then(done_noArg, fail_noArg); }
        /// <summary>
        /// Then Done引数○ 戻り値○ Fail引数× 戻り値×
        /// </summary>
        public Deferred<NextDoneArgT, NextFailArgT> Then<NextDoneArgT, NextFailArgT>(Func<Deferred<NextDoneArgT, NextFailArgT>> done_noArg, Action fail_noArgRet)
        {
            var done = make_done_noArg_<NextDoneArgT, NextFailArgT>(done_noArg);
            var fail = make_fail_noArgRet_<NextDoneArgT, NextFailArgT>(fail_noArgRet);
            return Then(done, fail);
        }
        public Deferred<NextDoneArgT, NextFailArgT> ThenFA<NextDoneArgT, NextFailArgT>(Func<Deferred<NextDoneArgT, NextFailArgT>> done_noArg, Action fail_noArgRet) { return Then(done_noArg, fail_noArgRet); }
        /// <summary>
        /// Then Done引数× 戻り値× Fail引数× 戻り値×
        /// </summary>
        public Deferred<object, object> Then(Action done_noArgRet, Action fail_noArgRet)
        {
            var done = make_done_noArgRet_<object, object>(done_noArgRet);
            var fail = make_fail_noArgRet_<object, object>(fail_noArgRet);
            return Then(done, fail);
        }
        public Deferred<object, object> ThenA(Action done_noArgRet, Action fail_noArgRet) { return Then(done_noArgRet, fail_noArgRet); }
        /// <summary>
        /// Then Done引数○ 戻り値○ Fail無し
        /// </summary>
        public Deferred<NextDoneArgT, FailArgT> Then<NextDoneArgT>(Func<DoneArgT, Deferred<NextDoneArgT, FailArgT>> done)
        {
            var fail = make_fail_Pass_<NextDoneArgT>();
            return Then(done, fail);
        }
        public Deferred<NextDoneArgT, FailArgT> ThenF<NextDoneArgT>(Func<DoneArgT, Deferred<NextDoneArgT, FailArgT>> done) { return Then<NextDoneArgT>(done); }
        /// <summary>
        /// Then Done引数× 戻り値○ Fail無し
        /// </summary>
        public Deferred<NextDoneArgT, FailArgT> Then<NextDoneArgT>(Func<Deferred<NextDoneArgT, FailArgT>> done_noArg)
        {
            var done = make_done_noArg_<NextDoneArgT, FailArgT>(done_noArg);
            var fail = make_fail_Pass_<NextDoneArgT>();
            return Then(done, fail);
        }
        public Deferred<NextDoneArgT, FailArgT> ThenF<NextDoneArgT>(Func<Deferred<NextDoneArgT, FailArgT>> done_noArg) { return Then<NextDoneArgT>(done_noArg); }
        /// <summary>
        /// Then Done引数○ 戻り値× Fail無し
        /// </summary>
        public Deferred<object, FailArgT> Then(Action<DoneArgT> done_noRet)
        {
            var done = make_done_noRet_<object, FailArgT>(done_noRet);
            var fail = make_fail_Pass_<object>();
            return Then(done, fail);
        }
        public Deferred<object, FailArgT> ThenA(Action<DoneArgT> done_noRet) { return Then(done_noRet); }
        /// <summary>
        /// Then Done引数× 戻り値× Fail無し
        /// </summary>
        public Deferred<object, FailArgT> Then(Action done_noArgRet)
        {
            var done = make_done_noArgRet_<object, FailArgT>(done_noArgRet);
            var fail = make_fail_Pass_<object>();
            return Then(done, fail);
        }
        public Deferred<object, FailArgT> ThenA(Action done_noArgRet) { return Then(done_noArgRet); }




        /// <summary>
        /// Fail Done引数○ 戻り値○ Fail無し
        /// </summary>
        public Deferred<DoneArgT, NextFailArgT> Fail<NextFailArgT>(Func<FailArgT, Deferred<DoneArgT, NextFailArgT>> fail)
        {
            var done = make_done_Pass_<NextFailArgT>();
            return Then(done, fail);
        }
        public Deferred<DoneArgT, NextFailArgT> FailF<NextFailArgT>(Func<FailArgT, Deferred<DoneArgT, NextFailArgT>> fail) { return Fail(fail); }
        /// <summary>
        /// Fail Done引数× 戻り値○ Fail無し
        /// </summary>
        public Deferred<DoneArgT, NextFailArgT> Fail<NextFailArgT>(Func<Deferred<DoneArgT, NextFailArgT>> fail_noArg)
        {
            var done = make_done_Pass_<NextFailArgT>();
            var fail = make_fail_noArg_<DoneArgT, NextFailArgT>(fail_noArg);
            return Then(done, fail);
        }
        public Deferred<DoneArgT, NextFailArgT> FailF<NextFailArgT>(Func<Deferred<DoneArgT, NextFailArgT>> fail_noArg) { return Fail(fail_noArg); }
        /// <summary>
        /// Fail Done引数○ 戻り値× Fail無し
        /// </summary>
        public Deferred<DoneArgT, object> Fail(Action<FailArgT> fail_noRet)
        {
            var done = make_done_Pass_<object>();
            var fail = make_fail_noRet_<DoneArgT, object>(fail_noRet);
            return Then(done, fail);
        }
        public Deferred<DoneArgT, object> FailA(Action<FailArgT> fail_noRet) { return Fail(fail_noRet); }
        /// <summary>
        /// Fail Done引数× 戻り値× Fail無し
        /// </summary>
        public Deferred<DoneArgT, object> Fail(Action fail_noArgRet)
        {
            var done = make_done_Pass_<object>();
            var fail = make_fail_noArgRet_<DoneArgT, object>(fail_noArgRet);
            return Then(done, fail);
        }
        public Deferred<DoneArgT, object> FailA(Action fail_noArgRet) { return Fail(fail_noArgRet); }


        #region Then implements
        Func<DoneArgT, Deferred<D, F>> make_done_noRet_<D, F>(Action<DoneArgT> done_noRet)
        {
            return (arg) => { done_noRet(arg); var dfd = new Deferred<D, F>(); dfd.Resolve(); return dfd; }; 
        }
        Func<FailArgT, Deferred<D, F>> make_fail_noRet_<D, F>(Action<FailArgT> fail_noRet)
        {
            return (arg) => { fail_noRet(arg); var dfd = new Deferred<D, F>(); dfd.Reject(); return dfd; }; 
        }
        Func<DoneArgT, Deferred<D, F>> make_done_noArg_<D, F>(Func<Deferred<D, F>> done_noArg)
        {
            return (arg) => { return done_noArg(); };
        }
        Func<FailArgT, Deferred<D, F>> make_fail_noArg_<D, F>(Func<Deferred<D, F>> fail_noArg)
        {
            //MEMO:Passと違って関数指定があるので引数の受け渡しは途切れていいはず
            return (arg) => { return fail_noArg(); };
        }
        Func<DoneArgT, Deferred<D, F>> make_done_noArgRet_<D, F>(Action done_noArgRet)
        {
            //MEMO:Passと違って関数指定があるので引数の受け渡しは途切れていいはず
            return (arg) => { done_noArgRet(); var dfd = new Deferred<D, F>(); dfd.Resolve(); return dfd; };
        }
        Func<FailArgT, Deferred<D, F>> make_fail_noArgRet_<D, F>(Action fail_noArgRet)
        {
            //MEMO:Passと違って関数指定があるので引数の受け渡しは途切れていいはず
            return (arg) => { fail_noArgRet(); var dfd = new Deferred<D, F>(); dfd.Reject(); return dfd; };
        }
        Func<DoneArgT, Deferred<DoneArgT, F>> make_done_Pass_<F>()
        {
            //MEMO:そのまま引数をスルーです
            return (arg) => { var dfd = new Deferred<DoneArgT,F>(); dfd.Resolve(arg); return dfd; };
        }
        Func<FailArgT, Deferred<D, FailArgT>> make_fail_Pass_<D>()
        {
            //MEMO:そのまま引数をスルーです
            return (arg) => { var dfd = new Deferred<D, FailArgT>(); dfd.Reject(arg); return dfd; };
        }
        #endregion

        #endregion

#if false
        public Deferred<DoneArgT, FailArgT> Then(Func<Deferred<DoneArgT, FailArgT>> done, Func<Deferred<DoneArgT, FailArgT>> fail)
        {
            done_ = (arg) => { if (done != null) { return done(); } return new Deferred<DoneArgT, FailArgT>().Resolve(arg); };
            fail_ = (arg) => { if (fail != null) { return fail(); } return new Deferred<DoneArgT, FailArgT>().Reject(arg); };
            return thenExec_();
        }
        public Deferred<DoneArgT, FailArgT> Then(Action done, Action fail)
        {
            done_ = (arg) => { if (done != null)done(); return new Deferred<DoneArgT, FailArgT>().Resolve(arg); };
            fail_ = (arg) => { if (fail != null)fail(); return new Deferred<DoneArgT, FailArgT>().Reject(arg); };
            return thenExec_();
        }
        public Deferred<DoneArgT, FailArgT> Then<T1, T2>(Action<T1> done, Action<T2> fail)
        {
            done_ = (arg) => { if (done != null)done((T1)arg); return new Deferred<DoneArgT, FailArgT>().Resolve(arg); };
            fail_ = (arg) => { if (fail != null)fail((T2)arg); return new Deferred<DoneArgT, FailArgT>().Reject(arg); };
            return thenExec_();
        }

        public Deferred<DoneArgT, FailArgT> Then<T>(Func<T, Deferred<DoneArgT, FailArgT>> done)
        {
            return Then(done, (Func<T, Deferred<DoneArgT, FailArgT>>)null);
        }
        public Deferred<DoneArgT, FailArgT> Then(Func<Deferred<DoneArgT, FailArgT>> done)
        {
            return Then(done, (Func<Deferred<DoneArgT, FailArgT>>)null);
        }
        public Deferred<DoneArgT, FailArgT> Then(Action done)
        {
            return Then(done, (Action)null);
        }
        public Deferred<DoneArgT, FailArgT> Then<T>(Action<T> done)
        {
            return Then<T, object>(done, (Action<object>)null);
        }
        protected Deferred<DoneArgT, FailArgT> thenExec_()
        {
            if (state_ == State.Pending)
            {
            }
            else if (state_ == State.Resolve)
            {
                return done_(arg_);
            }
            else if (state_ == State.Reject)
            {
                return fail_(arg_);
            }
            //非同期実行の為に自分のResolveやRejectが呼ばれたときの次の処理を登録する為のdfdを作ります
            var callbackDfd = new Deferred<DoneArgT, FailArgT>();

            var doneOrg = done_;
            var failOrg = fail_;
            done_ = (arg) => {
                return doneOrg(arg).Then<object>((arg2) => { callbackDfd.Resolve(arg2); });
            };
            fail_ = (arg) => {
                return failOrg(arg).Then<object,object>(null,(arg2) => { callbackDfd.Reject(arg2); });
            };
            return callbackDfd;
        }
#endif

        #region テストコード
        /// <summary>
        /// テストコード仮置き場
        /// </summary>
        static public void DeferredTestCode()
        {
            var dfd1 = new Deferred();
            System.Diagnostics.Debug.WriteLine("1:");

            dfd1
            .Then<object>((obj)=>{
                System.Diagnostics.Debug.WriteLine("2:arg+Ret");
                var dfd2 = new Deferred();
                
                dfd2.Resolve();

                return dfd2
                .Then((obj2) =>
                {
                    System.Diagnostics.Debug.WriteLine("3:arg");
                })
                .Then(() => { 
                    System.Diagnostics.Debug.WriteLine("4:");
                })
                .Then((a) => { 
                    System.Diagnostics.Debug.WriteLine("5:");
                })
                .Then(() => {
                    System.Diagnostics.Debug.WriteLine("6:");
                    var dfd3 = new Deferred();
                    dfd3.Resolve();
                    return dfd3;
                })
                .Then(() => {
                    System.Diagnostics.Debug.WriteLine("7:");
                    var dfd4 = new Deferred();
                    var t1 = new System.Threading.Timer(
                        (o) => {
                            dfd4.Resolve();
                        },
                        null, 4000, System.Threading.Timeout.Infinite);
                    return dfd4;
                })
                .Then(() =>
                {
                    System.Diagnostics.Debug.WriteLine("8:");
                })
                ;
            })
            .Then((obj)=>{
                System.Diagnostics.Debug.WriteLine("100:");
            });

            dfd1.Resolve("arg1");
        }
        #endregion
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
