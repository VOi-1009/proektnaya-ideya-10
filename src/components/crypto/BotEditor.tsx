import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { LEVELS, nameCls } from "@/lib/status";
import StatusBadge from "./StatusBadge";
import UserAvatar from "./UserAvatar";
import MemberIcon from "./MemberIcon";
import { BotForm, inputCls } from "./usersAdmin";

interface Props {
  bot: BotForm;
  setBot: (b: BotForm | null) => void;
  saving: boolean;
  avatarBusy: boolean;
  onSave: () => void;
  onAvatar: (file: File | null) => void;
  onRemoveAvatar: () => void;
}

const BotEditor = ({ bot, setBot, saving, avatarBusy, onSave, onAvatar, onRemoveAvatar }: Props) => (
  <div className="bg-card border border-primary/50 rounded-lg p-4 space-y-3 animate-fade-in">
    <div className="text-white font-semibold flex items-center gap-2">
      <Icon name="Bot" size={18} className="text-primary" />
      {bot.id ? "Карточка бота" : "Новый бот"}
    </div>
    <div className="grid sm:grid-cols-3 gap-3">
      <label className="space-y-1">
        <span className="text-xs text-muted-foreground">Имя (видно всем)</span>
        <input
          className={inputCls}
          value={bot.name}
          maxLength={60}
          onChange={(e) => setBot({ ...bot, name: e.target.value })}
          placeholder="Например, Алексей К."
          autoFocus
        />
      </label>
      <label className="space-y-1">
        <span className="text-xs text-muted-foreground">Город (необязательно)</span>
        <input
          className={inputCls}
          value={bot.city}
          maxLength={100}
          onChange={(e) => setBot({ ...bot, city: e.target.value })}
          placeholder="Москва"
        />
      </label>
      <label className="space-y-1">
        <span className="text-xs text-muted-foreground">Статус</span>
        <select className={inputCls} value={bot.level} onChange={(e) => setBot({ ...bot, level: e.target.value })}>
          {LEVELS.map((l, i) => (
            <option key={l.title} value={i + 1}>
              {l.title}
            </option>
          ))}
        </select>
      </label>
    </div>
    <div className="flex items-center gap-3 flex-wrap">
      <UserAvatar name={bot.name || "Б"} avatar={bot.avatar} className="w-14 h-14 text-xl" />
      {bot.id ? (
        <div className="flex flex-wrap gap-2">
          <label
            className={`inline-flex items-center gap-1.5 px-3 h-9 rounded-md border border-input text-sm cursor-pointer hover:bg-hover hover:text-white ${
              avatarBusy ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            <Icon name={avatarBusy ? "Loader2" : "Upload"} size={14} className={avatarBusy ? "animate-spin" : ""} />
            {bot.avatar ? "Заменить аватарку" : "Загрузить аватарку"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                onAvatar(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
          </label>
          {bot.avatar && (
            <button onClick={onRemoveAvatar} disabled={avatarBusy} className="text-xs text-muted-foreground hover:text-down">
              Убрать
            </button>
          )}
        </div>
      ) : (
        <span className="text-xs text-muted-foreground">Аватарку можно загрузить сразу после создания бота</span>
      )}
    </div>
    <div className="text-[11px] text-muted-foreground">
      У «Медведя» и «Быка» вместо аватарки всегда показывается красный или зелёный значок статуса.
    </div>
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-xs text-muted-foreground">Так его увидят посетители:</span>
      <MemberIcon name={bot.name || "Б"} level={Number(bot.level)} avatar={bot.avatar} />
      <span className={`text-sm ${nameCls(Number(bot.level), "text-white")}`}>{bot.name || "Имя бота"}</span>
      <StatusBadge level={Number(bot.level)} compact />
    </div>
    <div className="flex gap-2">
      <Button onClick={onSave} disabled={saving} className="font-semibold">
        {saving && <Icon name="Loader2" size={16} className="mr-1.5 animate-spin" />}
        {bot.id ? "Сохранить" : "Создать"}
      </Button>
      <Button
        variant="outline"
        onClick={() => setBot(null)}
        className="bg-transparent border-input hover:bg-hover hover:text-white"
      >
        Отмена
      </Button>
    </div>
  </div>
);

export default BotEditor;
