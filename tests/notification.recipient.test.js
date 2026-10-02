import {afterAll,it,expect,spyOn} from "bun:test";
import axios from "axios";
import {sendUserNotification} from "../utils/sendNotifications";
const saved=process.env.MESSAGE_CHANNEL_ACCESS_TOKEN;process.env.MESSAGE_CHANNEL_ACCESS_TOKEN="test-only";
const post=spyOn(axios,"post").mockResolvedValue({data:{}});
afterAll(()=>{post.mockRestore();if(saved===undefined)delete process.env.MESSAGE_CHANNEL_ACCESS_TOKEN;else process.env.MESSAGE_CHANNEL_ACCESS_TOKEN=saved;});
it("does not send a Google identity to the LINE API",async()=>{await sendUserNotification("google:12345","test");expect(post).not.toHaveBeenCalled();});
it("preserves notification delivery for valid LINE identities",async()=>{await sendUserNotification("U"+"a".repeat(32),"test");expect(post).toHaveBeenCalledTimes(1);});
