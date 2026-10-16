interface Props {
  name?: string;
  email?: string;
  avatar?: string;
  className?: string;
}

const UserAvatar = ({ name, email, avatar, className = "w-8 h-8 text-sm" }: Props) => {
  const letter = (name || email || "Г").trim()[0]?.toUpperCase() ?? "Г";
  return avatar ? (
    <img src={avatar} alt={name || "Аватар"} className={`rounded-full object-cover flex-shrink-0 ${className}`} />
  ) : (
    <div className={`rounded-full bg-primary text-white font-display flex items-center justify-center flex-shrink-0 ${className}`}>
      {letter}
    </div>
  );
};

export default UserAvatar;
