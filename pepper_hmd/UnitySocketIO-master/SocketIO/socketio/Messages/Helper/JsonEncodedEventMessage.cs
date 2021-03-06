﻿using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Text;
using SimpleJson.Reflection;

namespace SocketIOClient.Messages
{
    public class JsonEncodedEventMessage
    {
         public string name { get; set; }

         public object[] args { get; set; }

        public JsonEncodedEventMessage()
        {
        }
        
		public JsonEncodedEventMessage(string name, object payload) : this(name, new[]{payload})
        {

        }
        
		public JsonEncodedEventMessage(string name, object[] payloads)
        {
            this.name = name;
            this.args = payloads;
        }

        public T GetFirstArgAs<T>()
        {
            try
            {
                var firstArg = this.args.FirstOrDefault();
                if (firstArg != null)
                    return SimpleJson.SimpleJson.DeserializeObject<T>(firstArg.ToString());
            }
            catch (Exception ex)
            {
                // add error logging here
                throw;
            }
            return default(T);
        }
        public IEnumerable<T> GetArgsAs<T>()
        {
            List<T> items = new List<T>();
            foreach (var i in this.args)
            {
                items.Add( SimpleJson.SimpleJson.DeserializeObject<T>(i.ToString()) );
            }
            return items.AsEnumerable();
        }

        public string ToJsonString()
        {
            return SimpleJson.SimpleJson.SerializeObject(this);
        }

        public static JsonEncodedEventMessage Deserialize(string jsonString)
        {
			JsonEncodedEventMessage msg = null;
			try { 
                msg = SimpleJson.SimpleJson.DeserializeObject<JsonEncodedEventMessage>(jsonString); 
            }
			catch (Exception ex)
			{
                //@@何やら形式によって失敗するので再度チャレンジ…@@
                try
                {
                    var obj = SimpleJson.SimpleJson.DeserializeObject(jsonString);
                    var table = obj as IDictionary<string,object>;
                    if(table!=null && table["name"]!=null && table["args"]!=null){
                        var name = table["name"] as string;
                        var args = table["args"] as IDictionary<string, object>;
                        if (name != null && args != null)
                        {
                            msg = new JsonEncodedEventMessage(name, args);
                        }
                    }
                }
                catch (Exception ex2)
                {
                    Trace.WriteLine(ex2);
                }
			}
            return msg;
        }
    }
}
